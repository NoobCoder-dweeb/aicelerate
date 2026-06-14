from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Optional, Union
import csv
from io import StringIO

lecturer_bp = Blueprint('lecturer_bp', __name__)
JSONResponse = Union[Response, tuple[Response, int]]

@lecturer_bp.route('/lecturer')
@login_required
def lecturer():
    username = current_user.id
    # Fetch departments
    tags = []
    tags_ref = db.collection('users').document(username).collection('tagging_department')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        tag['id'] = doc.id
        tag['color'] = tag.get('color')
        tags.append(tag)

    # Fetch lecturers
    lecturers = []
    lecturers_ref = db.collection('users').document(username).collection('lecturers')
    for doc in lecturers_ref.stream():
        lecturer = doc.to_dict()
        lecturer['staff_id'] = doc.id
        lecturer['name'] = lecturer.get('name', '')
        lecturer['department'] = lecturer.get('department', '')
        lecturer['position'] = lecturer.get('position', '')
        lecturer['description'] = lecturer.get('description', '')
        lecturers.append(lecturer)

    return render_template('lecturer.html', departments=tags, lecturers=lecturers)

@lecturer_bp.route('/add_lecturer', methods=['POST'])
@login_required
def add_lecturer() -> JSONResponse:
    """
    Add a new lecturer to the database
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    staff_id = data.get('staff_id')
    name = data.get('name')
    department = data.get('department')
    position = data.get('position')
    description = data.get('description')

    # Validation
    if not staff_id or not name or not department or not position:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    username = current_user.id
    try:
        doc_data = {
            'staff_id': staff_id,
            'name': name,
            'department': department,
            'position': position,
            'description': description
        }
        db.collection('users') \
          .document(username) \
          .collection('lecturers') \
          .document(staff_id) \
          .set(doc_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@lecturer_bp.route('/edit_lecturer', methods=['PUT'])
@login_required
def edit_lecturer() -> JSONResponse:
    """
    Edit an existing lecturer in the database.
    @Returns:
        - JSON response with updated lecturer or error
    """
    data = request.json
    staff_id = data.get('staff_id')
    name = data.get('name')
    department = data.get('department')
    position = data.get('position')
    description = data.get('description')

    # Validation: staff_id is required and is the document id
    if not staff_id or not name or not department or not position:
        return jsonify({'success': False, 'error': 'Missing or invalid required fields'}), 400

    username = current_user.id
    try:
        doc_ref = db.collection('users').document(username).collection('lecturers').document(staff_id)
        doc_ref.update({
            'name': name,
            'department': department,
            'position': position,
            'description': description
        })
        updated_doc = doc_ref.get()
        updated_data = updated_doc.to_dict() if updated_doc.exists else {}
        updated_data['staff_id'] = staff_id
        return jsonify({'success': True, **updated_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@lecturer_bp.route('/delete_lecturer', methods=['POST'])
@login_required
def delete_lecturer() -> JSONResponse:
    """
    Delete a lecturer from the database.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    staff_id = data.get('lecturer_id')
    if not staff_id:
        return jsonify({'success': False, 'error': 'No lecturer id provided'}), 400

    username = current_user.id
    try:
        db.collection('users').document(username).collection('lecturers').document(staff_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@lecturer_bp.route('/upload/lecturers', methods=['POST'])
@login_required
def upload_lecturers_csv() -> JSONResponse:
    """
    Upload and process CSV file containing lecturer data.
    Validates that departments exist in tagging_department collection.
    @Returns:
        - JSON response with success/failure and processing details
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'success': False, 'error': 'Only CSV files are allowed'}), 400
    
    username = current_user.id
    
    try:
        # Get existing departments
        departments = {}
        tags_ref = db.collection('users').document(username).collection('tagging_department')
        for doc in tags_ref.stream():
            dept = doc.to_dict()
            departments[dept.get('name', '').lower()] = doc.id
        
        # Valid positions
        valid_positions = {
            'head of department',
            'program leader', 
            'full time lecturer',
            'part time lecturer'
        }
        
        # Read and process CSV
        csv_content = file.read().decode('utf-8')
        csv_lines = csv_content.strip().split('\n')
        
        if not csv_lines:
            return jsonify({'success': False, 'error': 'CSV file is empty'}), 400
        
        # Process rows
        processed = 0
        skipped = 0
        errors = []
        
        lecturers_ref = db.collection('users').document(username).collection('lecturers')
        
        for row_num, line in enumerate(csv_lines, start=1):
            try:
                # Parse CSV line
                row_data = list(csv.reader([line]))[0]
                
                # Ensure we have at least 4 columns
                if len(row_data) < 4:
                    errors.append(f'Row {row_num}: Insufficient columns (expected 4: StaffID, Name, Department, Position)')
                    skipped += 1
                    continue
                
                # Extract data from columns (0=StaffID, 1=Name, 2=Department, 3=Position)
                staff_id = str(row_data[0]).strip()
                name = str(row_data[1]).strip()
                department = str(row_data[2]).strip()
                position = str(row_data[3]).strip()
                description = str(row_data[4]).strip() if len(row_data) > 4 else ''
                
                # Convert empty description to None
                description = description if description else None
                
                # Validate required fields
                if not all([staff_id, name, department, position]):
                    errors.append(f'Row {row_num}: Missing required fields')
                    skipped += 1
                    continue
                
                # Check if department exists
                if department.lower() not in departments:
                    errors.append(f'Row {row_num}: Department "{department}" not found')
                    skipped += 1
                    continue
                
                # Validate position
                if position.lower() not in valid_positions:
                    errors.append(f'Row {row_num}: Invalid position "{position}". Must be one of: Head of Department, Program Leader, Full Time Lecturer, Part Time Lecturer')
                    skipped += 1
                    continue
                
                # Check if staff ID already exists
                existing_doc = lecturers_ref.document(staff_id).get()
                if existing_doc.exists:
                    errors.append(f'Row {row_num}: Staff ID "{staff_id}" already exists')
                    skipped += 1
                    continue
                
                # Add lecturer to database
                doc_data = {
                    'staff_id': staff_id,
                    'name': name,
                    'department': department,
                    'position': position,
                    'description': description
                }
                
                lecturers_ref.document(staff_id).set(doc_data)
                processed += 1
                
            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')
                skipped += 1
        
        # Prepare response
        response_data = {
            'success': True,
            'processed': processed,
            'skipped': skipped,
            'message': f'Successfully processed {processed} lecturers. {skipped} rows skipped.'
        }
        
        if errors and len(errors) <= 10:  # Limit error messages
            response_data['errors'] = errors
        elif errors:
            response_data['errors'] = errors[:10] + [f'... and {len(errors) - 10} more errors']
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500