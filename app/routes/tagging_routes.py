from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Optional, Union

tagging_bp = Blueprint('tagging_bp', __name__)
JSONResponse = Union[Response, tuple[Response, int]]

@tagging_bp.route('/tagging-department')
@login_required
def tag_department():
    username = current_user.id
    tags = []
    tags_ref = db.collection('users').document(username).collection('tagging_department')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        tag['id'] = doc.id
        tag['color'] = tag.get('color')
        tags.append(tag)
    
    return render_template(
        "tagging_universal.html",
        heading="Tag Management -- Department",
        subtext="Organize subjects, lecturers, and classrooms with tags for smarter scheduling",
        placeholder="Enter tag name (e.g., Computing, Engineering, Business, etc.)",
        tagging_type="tagging_department",
        tags=tags,
        title="AICelerate - Department Tagging"
    )

@tagging_bp.route('/tagging-programme')
@login_required
def tag_programme():
    username = current_user.id
    tags = []
    tags_ref = db.collection('users').document(username).collection('tagging_programme')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        tag['id'] = doc.id
        tags.append(tag)

    departments_ref = db.collection('users').document(username).collection('tagging_department')
    departments = []
    for doc in departments_ref.stream():
        department = doc.to_dict()
        department['id'] = doc.id
        department['color'] = department.get('color')
        departments.append(department)

    subjects_ref = db.collection('users').document(username).collection('tagging_subject')
    subjects = []
    for doc in subjects_ref.stream():
        subject = doc.to_dict()
        subject['id'] = doc.id
        subjects.append(subject)

    return render_template(
        "tagging_universal.html",
        heading="Tag Management -- Programme",
        subtext="Organize subjects, lecturers, and classrooms with tags for smarter scheduling",
        placeholder="Enter tag name (e.g., Computer Science, Software Engineering, etc.)",
        tagging_type="tagging_programme",
        tags=tags,
        title="AICelerate - Programme Tagging",
        programme_tagging=True, # for JS to know this is programme tagging, user can select department instead of color
        departments=departments,
        subjects=subjects
    )

@tagging_bp.route('/tagging-subject')
@login_required
def tag_subject():
    username = current_user.id
    tags = []
    tags_ref = db.collection('users').document(username).collection('tagging_subject')
    for doc in tags_ref.stream():
        tag = doc.to_dict()
        tag['id'] = doc.id
        tag['color'] = tag.get('color')
        tags.append(tag)
    
    return render_template(
        "tagging_universal.html",
        heading="Tag Management -- Subject Level",
        subtext="Organize subjects, lecturers, and classrooms with tags for smarter scheduling",
        placeholder="Enter tag name (e.g., Degree, Diploma, etc.)",
        tagging_type="tagging_subject",
        tags=tags,
        title="AICelerate - Programme Tagging"
    )

'''
Below are the functions to handle adding, updating, and deleting tags.
'''

@tagging_bp.route('/add_tag', methods=['POST'])
@login_required
def add_tag() -> JSONResponse:
    """
    Add a new tag to the database
    Depending on the tagging type, it can be a department, programme, or subject tag.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    tag_name:[str] = data.get('name')
    tagging_type:[str] = data.get('tagging_type')
    tag_color:Optional[str] = data.get('color')
    department:Optional[str] = data.get('department')
    subject_level:Optional[str] = data.get('subject_level')

    if not tag_name or tagging_type not in ['tagging_department', 'tagging_programme', 'tagging_subject']:
        return jsonify({'success': False, 'error': 'Invalid data'}), 400

    username = current_user.id
    try:
        doc_data = {'name': tag_name}
        # if tagging_type is tagging_programme, store department and subject_id in programme tag else store color for subject/department tags
        if tagging_type == 'tagging_programme':
            doc_data['department'] = department
            doc_data['subject_level'] = subject_level
        else:
            doc_data['color'] = tag_color

        db.collection('users') \
          .document(username) \
          .collection(tagging_type) \
          .document(tag_name) \
          .set(doc_data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@tagging_bp.route('/update_tag', methods=['POST'])
@login_required
def update_tag() -> JSONResponse:
    """
    Update a tag to the database
    Depending on the tagging type, it can be a department, programme, or subject tag.
    If department tag is updated, it will also update all related programme tags' department attribute.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    old_tag_id:[str] = data.get('old_tag_id')
    new_name:[str] = data.get('name')
    tagging_type:[str] = data.get('tagging_type')
    new_color:Optional[str] = data.get('color')
    department:Optional[str] = data.get('department')
    subject_level:Optional[str] = data.get('subject_level')

    if not old_tag_id or not new_name or tagging_type not in ['tagging_department', 'tagging_programme', 'tagging_subject']:
        return jsonify({'success': False, 'error': 'Invalid data'}), 400

    username = current_user.id
    try:
        # If tag name changed, delete old and create new
        if old_tag_id != new_name:
            db.collection('users').document(username).collection(tagging_type).document(old_tag_id).delete()

        doc_data = {'name': new_name}

        # if tagging_type is tagging_programme, store department and subject_level in programme tag else store color for subject/department tags
        if tagging_type == 'tagging_programme':
            doc_data['department'] = department
            doc_data['subject_level'] = subject_level
        else:
            doc_data['color'] = new_color

        db.collection('users').document(username).collection(tagging_type).document(new_name).set(doc_data)

        # If updating a department tag, update all related programme tags' department attribute
        if tagging_type == 'tagging_department' and old_tag_id != new_name:
            # Find all programmes with department == old_tag_id and update to new_name
            programmes_ref = db.collection('users').document(username).collection('tagging_programme')
            for prog_doc in programmes_ref.stream():
                prog = prog_doc.to_dict()
                if prog.get('department') == old_tag_id:
                    # Update the department field to new_name
                    programmes_ref.document(prog_doc.id).update({'department': new_name})
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@tagging_bp.route('/delete_tag', methods=['POST'])
@login_required
def delete_tag() -> JSONResponse:
    """
    Delete selected tag in the database
    Depending on the tagging type, it can be a department, programme, or subject tag.
    If department tag is deleted, it will also delete all related programme tags with the same department attribute.
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    tag_id:[str] = data.get('tag_id')
    tagging_type:[str] = data.get('tagging_type')

    if not tag_id or tagging_type not in ['tagging_department', 'tagging_programme', 'tagging_subject']:
        return jsonify({'success': False, 'error': 'Invalid data'}), 400

    username = current_user.id
    try:
        db.collection('users').document(username).collection(tagging_type).document(tag_id).delete()

        # If deleting a department tag, also delete related programme, classroom, lecturer, and subject
        if tagging_type == 'tagging_department':
            collections = ['tagging_programme', 'classrooms', 'lecturers', 'subjects']
            for col in collections:
                ref = db.collection('users').document(username).collection(col)
                for doc in ref.stream():
                    if doc.to_dict().get('department') == tag_id:
                        ref.document(doc.id).delete()
        
        # If deleting a programme tag, also delete related subject 
        if tagging_type == 'tagging_programme':
            subjects_ref = db.collection('users').document(username).collection('subjects')
            for doc in subjects_ref.stream():
                if doc.to_dict().get('programme') == tag_id:
                    subjects_ref.document(doc.id).delete()

        # If deleting a subject tag, also delete related subject by level
        if tagging_type == 'tagging_subject':
            subjects_ref = db.collection('users').document(username).collection('subjects')
            for doc in subjects_ref.stream():
                if doc.to_dict().get('level') == tag_id:
                    subjects_ref.document(doc.id).delete()


        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500