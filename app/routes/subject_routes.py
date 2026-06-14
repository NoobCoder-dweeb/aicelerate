from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Optional, Union
import csv
from io import StringIO

subject_bp = Blueprint('subject_bp', __name__)
JSONResponse = Union[Response, tuple[Response, int]]

@subject_bp.route('/subject')
@login_required
def subject():
    username = current_user.id
    
    # Fetch departments
    departments = []
    tags_ref = db.collection('users').document(username).collection('tagging_department')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        departments.append({
            'id': doc.id,
            'name': tag.get('name', doc.id)
        })
    
    # Fetch levels
    levels = []
    levels_ref = db.collection('users').document(username).collection('tagging_subject')
    for doc in levels_ref.stream():
        level = doc.to_dict()
        levels.append({
            'id': doc.id,
            'name': level.get('name', doc.id)
        })
    
    # Fetch lecturers with department information
    lecturers_by_department = {}
    lecturers_ref = db.collection('users').document(username).collection('lecturers')
    for doc in lecturers_ref.stream():
        lecturer = doc.to_dict()
        if lecturer.get('name'):
            dept_id = lecturer.get('department')
            if dept_id:
                if dept_id not in lecturers_by_department:
                    lecturers_by_department[dept_id] = []
                lecturers_by_department[dept_id].append({
                    'name': lecturer['name'],
                    'department': dept_id
                })
    
    # Fetch classrooms by department
    classrooms_by_department = {}
    classrooms_ref = db.collection('users').document(username).collection('classrooms')
    for doc in classrooms_ref.stream():
        classroom = doc.to_dict()
        if classroom.get('name'):
            dept_id = classroom.get('department')
            if dept_id not in classrooms_by_department:
                classrooms_by_department[dept_id] = []
            classrooms_by_department[dept_id].append({
                'id': doc.id,
                'name': classroom['name'],
                'department': dept_id
            })
    
    # Fetch programmes by department
    programmes_by_department = {}
    programmes_ref = db.collection('users').document(username).collection('tagging_programme')
    for doc in programmes_ref.stream():
        prog = doc.to_dict()
        dept_id = prog.get('department')
        if dept_id:
            if dept_id not in programmes_by_department:
                programmes_by_department[dept_id] = []
            programmes_by_department[dept_id].append({
                'id': doc.id, 
                'name': prog.get('name', doc.id),
                'subject_level': prog.get('subject_level', '')
            })

    # Fetch subjects
    subjects = []
    subjects_ref = db.collection('users').document(username).collection('subjects')
    for doc in subjects_ref.stream():
        subject = doc.to_dict()
        subject['id'] = doc.id
        subjects.append(subject)
    

    return render_template(
        'subject.html',
        departments=departments,
        levels=levels,
        subjects=subjects,
        programmes_by_department=programmes_by_department,
        classrooms_by_department=classrooms_by_department,
        lecturers_by_department=lecturers_by_department
    )

@subject_bp.route('/add_subject', methods=['POST'])
@login_required
def add_subject() -> JSONResponse:
    """
    Add a new subject to the database
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    subject_id = data.get('subject_id')
    name = data.get('name')
    department = data.get('department')
    programme = data.get('programme')
    credits = data.get('credits')
    level = data.get('level')
    duration = data.get('duration')
    lecturer = data.get('lecturer')
    classroom = data.get('classroom')
    
    # Validation
    if not subject_id or not name or not department or not credits or not level or not duration or not lecturer or not programme:
        return jsonify({'success': False, 'error': 'Missing required fields'}), 400
    
    username = current_user.id
    try:
        doc_data = {
            'subject_id': subject_id,
            'name': name,
            'department': department,
            'programme': programme,
            'credits': credits,
            'level': level,
            'duration': duration,
            'lecturer': lecturer,
            'classroom': classroom
        }
        db.collection('users').document(username).collection('subjects').document(subject_id).set(doc_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@subject_bp.route('/edit_subject', methods=['PUT'])
@login_required
def edit_subject() -> JSONResponse:
    """
    Edit an existing subject in the database.
    @Returns:
        - JSON response with updated subject or error
    """
    data = request.json
    subject_id = data.get('subject_id')
    name = data.get('name')
    department = data.get('department')
    programme = data.get('programme')
    credits = data.get('credits')
    level = data.get('level')
    duration = data.get('duration')
    lecturer = data.get('lecturer')
    classroom = data.get('classroom')
    
    # Validation
    if not subject_id or not name or not department or not credits or not level or not duration or not lecturer or not programme:
        return jsonify({'success': False, 'error': 'Missing or invalid required fields'}), 400
    
    username = current_user.id
    try:
        doc_ref = db.collection('users').document(username).collection('subjects').document(subject_id)
        doc_ref.update({
            'name': name,
            'department': department,
            'programme': programme,
            'credits': credits,
            'level': level,
            'duration': duration,
            'lecturer': lecturer,
            'classroom': classroom
        })
        updated_doc = doc_ref.get()
        updated_data = updated_doc.to_dict() if updated_doc.exists else {}
        updated_data['subject_id'] = subject_id
        return jsonify({'success': True, **updated_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@subject_bp.route('/delete_subject', methods=['POST'])
@login_required
def delete_subject() -> JSONResponse:
    """
    Delete a subject from the database.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    subject_id = data.get('subject_id')
    if not subject_id:
        return jsonify({'success': False, 'error': 'No subject id provided'}), 400
    
    username = current_user.id
    try:
        db.collection('users').document(username).collection('subjects').document(subject_id).delete()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@subject_bp.route('/upload/subjects', methods=['POST'])
@login_required
def upload_subjects_csv() -> JSONResponse:
    """
    Upload and process CSV file containing subject data.
    Validates that departments, programmes, levels, lecturers, and classrooms exist.
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
        
        # Get existing levels
        levels = {}
        levels_ref = db.collection('users').document(username).collection('tagging_subject')
        for doc in levels_ref.stream():
            level = doc.to_dict()
            levels[level.get('name', '').lower()] = doc.id
        
        # Get existing programmes by department
        programmes_by_dept = {}
        programmes_ref = db.collection('users').document(username).collection('tagging_programme')
        for doc in programmes_ref.stream():
            prog = doc.to_dict()
            dept_id = prog.get('department')
            if dept_id:
                if dept_id not in programmes_by_dept:
                    programmes_by_dept[dept_id] = {}
                programmes_by_dept[dept_id][prog.get('name', '').lower()] = doc.id
        
        # Get existing lecturers by department
        lecturers_by_dept = {}
        lecturers_ref = db.collection('users').document(username).collection('lecturers')
        for doc in lecturers_ref.stream():
            lecturer = doc.to_dict()
            dept_id = lecturer.get('department')
            if dept_id:
                if dept_id not in lecturers_by_dept:
                    lecturers_by_dept[dept_id] = set()
                lecturers_by_dept[dept_id].add(lecturer.get('name', '').lower())
        
        # Get existing classrooms by department
        classrooms_by_dept = {}
        classrooms_ref = db.collection('users').document(username).collection('classrooms')
        for doc in classrooms_ref.stream():
            classroom = doc.to_dict()
            dept_id = classroom.get('department')
            if dept_id:
                if dept_id not in classrooms_by_dept:
                    classrooms_by_dept[dept_id] = set()
                classrooms_by_dept[dept_id].add(doc.id.lower())
        
        # Read and process CSV
        csv_content = file.read().decode('utf-8')
        csv_lines = csv_content.strip().split('\n')
        
        if not csv_lines:
            return jsonify({'success': False, 'error': 'CSV file is empty'}), 400
        
        # Process rows
        processed = 0
        skipped = 0
        errors = []
        
        subjects_ref = db.collection('users').document(username).collection('subjects')
        
        for row_num, line in enumerate(csv_lines, start=1):
            try:
                # Parse CSV line
                row_data = list(csv.reader([line]))[0]
                
                # Ensure we have at least 8 columns
                if len(row_data) < 8:
                    errors.append(f'Row {row_num}: Insufficient columns (expected 8-9: SubjectCode, SubjectName, Department, Programme, Credits, Level, Duration, Lecturer, Classroom)')
                    skipped += 1
                    continue
                
                # Extract data from columns
                subject_code = str(row_data[0]).strip()
                subject_name = str(row_data[1]).strip()
                department = str(row_data[2]).strip()
                programme = str(row_data[3]).strip()
                credits_str = str(row_data[4]).strip()
                level = str(row_data[5]).strip()
                duration_str = str(row_data[6]).strip()
                lecturer = str(row_data[7]).strip()
                classroom = str(row_data[8]).strip() if len(row_data) > 8 else 'Random'
                
                # Validate required fields
                if not all([subject_code, subject_name, department, programme, credits_str, level, duration_str, lecturer]):
                    errors.append(f'Row {row_num}: Missing required fields')
                    skipped += 1
                    continue
                
                # Validate credits is numeric
                try:
                    credits = int(credits_str)
                    if credits <= 0 or credits > 6:
                        raise ValueError()
                except ValueError:
                    errors.append(f'Row {row_num}: Invalid credits value "{credits_str}" (must be 1-6)')
                    skipped += 1
                    continue
                
                # Validate duration is numeric
                try:
                    duration = float(duration_str)
                    if duration <= 0 or duration > 4:
                        raise ValueError()
                except ValueError:
                    errors.append(f'Row {row_num}: Invalid duration value "{duration_str}" (must be 0.5-4.0)')
                    skipped += 1
                    continue
                
                # Check if department exists
                dept_id = departments.get(department.lower())
                if not dept_id:
                    errors.append(f'Row {row_num}: Department "{department}" not found')
                    skipped += 1
                    continue
                
                # Check if level exists
                level_id = levels.get(level.lower())
                if not level_id:
                    errors.append(f'Row {row_num}: Level "{level}" not found')
                    skipped += 1
                    continue
                
                # Check if programme exists in department
                if dept_id not in programmes_by_dept or programme.lower() not in programmes_by_dept[dept_id]:
                    errors.append(f'Row {row_num}: Programme "{programme}" not found in department "{department}"')
                    skipped += 1
                    continue
                
                # Check if lecturer exists in department
                if dept_id not in lecturers_by_dept or lecturer.lower() not in lecturers_by_dept[dept_id]:
                    errors.append(f'Row {row_num}: Lecturer "{lecturer}" not found in department "{department}"')
                    skipped += 1
                    continue
                
                # Check if classroom exists in department (if not Random)
                if classroom != 'Random':
                    if dept_id not in classrooms_by_dept or classroom.lower() not in classrooms_by_dept[dept_id]:
                        errors.append(f'Row {row_num}: Classroom "{classroom}" not found in department "{department}"')
                        skipped += 1
                        continue
                
                # Check if subject code already exists
                existing_doc = subjects_ref.document(subject_code).get()
                if existing_doc.exists:
                    errors.append(f'Row {row_num}: Subject code "{subject_code}" already exists')
                    skipped += 1
                    continue
                
                # Add subject to database
                doc_data = {
                    'subject_id': subject_code,
                    'name': subject_name,
                    'department': department,
                    'programme': programme,
                    'credits': credits,
                    'level': level,
                    'duration': duration,
                    'lecturer': lecturer,
                    'classroom': classroom
                }
                
                subjects_ref.document(subject_code).set(doc_data)
                processed += 1
                
            except Exception as e:
                errors.append(f'Row {row_num}: {str(e)}')
                skipped += 1
        
        # Prepare response
        response_data = {
            'success': True,
            'processed': processed,
            'skipped': skipped,
            'message': f'Successfully processed {processed} subjects. {skipped} rows skipped.'
        }
        
        if errors and len(errors) <= 10:  # Limit error messages
            response_data['errors'] = errors
        elif errors:
            response_data['errors'] = errors[:10] + [f'... and {len(errors) - 10} more errors']
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Error processing file: {str(e)}'}), 500