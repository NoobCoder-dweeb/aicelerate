from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Optional, Union
import csv
from io import StringIO

classroom_bp = Blueprint('classroom_bp', __name__)
JSONResponse = Union[Response, tuple[Response, int]]

@classroom_bp.route('/classroom')
@login_required
def classroom():
    username = current_user.id
    # Fetch departments
    tags = []
    tags_ref = db.collection('users').document(username).collection('tagging_department')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        tag['id'] = doc.id
        tag['color'] = tag.get('color')
        tags.append(tag)

    # Fetch classrooms
    classrooms = []
    classrooms_ref = db.collection('users').document(username).collection('classrooms')
    for doc in classrooms_ref.stream():
        classroom = doc.to_dict()
        classroom['id'] = doc.id
        classrooms.append(classroom)

    return render_template('classroom.html', departments=tags, classrooms=classrooms)

@classroom_bp.route('/add_classroom', methods=['POST'])
@login_required
def add_classroom() -> JSONResponse:
    """
    Add a new classroom to the database
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    classroom_id = data.get('classroomId')
    name = data.get('name')
    department = data.get('department')
    capacity = data.get('capacity')
    description = data.get('description')

    # Validation
    if not classroom_id or not name or not department or not capacity:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400

    username = current_user.id
    try:
        doc_data = {
            'id': classroom_id,
            'name': name,
            'department': department,
            'capacity': capacity,
            'description': description
        }
        db.collection('users') \
          .document(username) \
          .collection('classrooms') \
          .document(classroom_id) \
          .set(doc_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@classroom_bp.route('/edit_classroom', methods=['PUT'])
@login_required
def edit_classroom() -> JSONResponse:
    """
    Edit an existing classroom in the database.
    @Returns:
        - JSON response with updated classroom or error
    """
    data = request.json
    id = data.get('id')  # Get id from JSON body now
    if not id:
        return jsonify({'success': False, 'error': 'No classroom id provided'}), 400
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    name = data.get('name')
    department = data.get('department')
    capacity = data.get('capacity')
    description = data.get('description')

    # Ensure capacity is an integer and not empty
    if not name or not department or capacity is None or capacity == '' or not str(capacity).isdigit():
        return jsonify({'success': False, 'error': 'Missing or invalid required fields'}), 400

    try:
        capacity = int(capacity)
    except Exception:
        return jsonify({'success': False, 'error': 'Capacity must be an integer'}), 400

    username = current_user.id
    try:
        doc_ref = db.collection('users').document(username).collection('classrooms').document(id)
        doc_ref.update({
            'name': name,
            'department': department,
            'capacity': capacity,
            'description': description
        })
        updated_doc = doc_ref.get()
        updated_data = updated_doc.to_dict() if updated_doc.exists else {}
        updated_data['id'] = id
        # Return updated fields for JS to update the table row
        return jsonify({
            'success': True,
            'name': updated_data.get('name'),
            'department': updated_data.get('department'),
            'capacity': updated_data.get('capacity'),
            'description': updated_data.get('description')
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@classroom_bp.route('/delete_classroom', methods=['POST'])
@login_required
def delete_classroom() -> JSONResponse:
    """
    Delete a classroom from the database.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    classroom_id = data.get('classroom_id')
    if not classroom_id:
        return jsonify({'success': False, 'error': 'No classroom id provided'}), 400

    username = current_user.id
    try:
        db.collection('users').document(username).collection('classrooms').document(classroom_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@classroom_bp.route('/upload/classrooms', methods=['POST'])
@login_required
def upload_classrooms_csv() -> JSONResponse:
    """
    Upload and process CSV file containing classroom data.
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
        
        # Read and process CSV
        csv_content = file.read().decode('utf-8')
        csv_lines = csv_content.strip().split('\n')
        
        if not csv_lines:
            return jsonify({'success': False, 'error': 'CSV file is empty'}), 400
        
        # Process rows
        processed = 0
        skipped = 0
        errors = []
        
        classrooms_ref = db.collection('users').document(username).collection('classrooms')
        
        for row_num, line in enumerate(csv_lines, start=1):
            try:
                # Parse CSV line
                row_data = list(csv.reader([line]))[0]
                
                # Ensure we have at least 4 columns
                if len(row_data) < 4:
                    errors.append(f'Row {row_num}: Insufficient columns (expected 4: ClassroomID, Name, Department, Capacity)')
                    skipped += 1
                    continue
                
                # Extract data from columns (0=ClassroomID, 1=Name, 2=Department, 3=Capacity)
                classroom_id = str(row_data[0]).strip()
                name = str(row_data[1]).strip()
                department = str(row_data[2]).strip()
                capacity_str = str(row_data[3]).strip()
                description = str(row_data[4]).strip() if len(row_data) > 4 else ''
                
                # Convert empty description to None
                description = description if description else None
                
                # Validate required fields
                if not all([classroom_id, name, department, capacity_str]):
                    errors.append(f'Row {row_num}: Missing required fields')
                    skipped += 1
                    continue
                
                # Validate capacity is numeric
                try:
                    capacity = int(capacity_str)
                    if capacity <= 0:
                        raise ValueError()
                except ValueError:
                    errors.append(f'Row {row_num}: Invalid capacity value "{capacity_str}"')
                    skipped += 1
                    continue
                
                # Check if department exists
                if department.lower() not in departments:
                    errors.append(f'Row {row_num}: Department "{department}" not found')
                    skipped += 1
                    continue
                
                # Check if classroom ID already exists
                existing_doc = classrooms_ref.document(classroom_id).get()
                if existing_doc.exists:
                    errors.append(f'Row {row_num}: Classroom ID "{classroom_id}" already exists')
                    skipped += 1
                    continue
                
                # Add classroom to database
                doc_data = {
                    'id': classroom_id,
                    'name': name,
                    'department': department,
                    'capacity': capacity,
                    'description': description
                }
                
                classrooms_ref.document(classroom_id).set(doc_data)
                processed += 1
                
            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')
                skipped += 1
        
        # Prepare response
        response_data = {
            'success': True,
            'processed': processed,
            'skipped': skipped,
            'message': f'Successfully processed {processed} classrooms. {skipped} rows skipped.'
        }
        
        if errors and len(errors) <= 10:  # Limit error messages
            response_data['errors'] = errors
        elif errors:
            response_data['errors'] = errors[:10] + [f'... and {len(errors) - 10} more errors']
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500