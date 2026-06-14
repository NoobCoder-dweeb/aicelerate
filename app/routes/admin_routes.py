from flask import Blueprint, render_template, request, jsonify, Response
from .. import db
from typing import Optional, Union

admin_bp = Blueprint('admin_bp', __name__)
JSONResponse = Union[Response, tuple[Response, int]]

@admin_bp.route('/admin', methods=['GET', 'POST'])
def admin():
    """
    Admin page to manage users
    
    - GET: Render the admin page with a login form
    - POST: Check the password and display the list of users if correct

    @Returns:
        - GET: Render the admin page with a login form
        - POST: Render the admin page with the list of users if password is correct, else render login page with error message
    """

    ADMIN_PASSWORD: str = "wewillrich"
    if request.method == 'POST':
        password = request.form.get('password')
        if password == ADMIN_PASSWORD:
            users_ref = db.collection('users')
            docs = users_ref.stream()
            users = [{'username': doc.id, 'password': doc.to_dict().get('password', '')} for doc in docs]
            return render_template('admin.html', users=users)
        else:
            error = "Incorrect password. Please try again."
            return render_template('login_admin.html', error=error)
    return render_template('login_admin.html')

@admin_bp.route('/add_user', methods=['POST'])
def add_user() -> JSONResponse:
    """
    Add a new user to the database
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    username:Optional[str] = data.get('username')
    password:Optional[str] = data.get('password')
    if username and password:
        db.collection('users').document(username).set({'password': password})
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid input'}), 400

@admin_bp.route('/delete_user', methods=['POST'])
def delete_user() -> JSONResponse:
    """
    Delete a user from the database
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    username: Optional[str] = data.get('username')
    if username:
        db.collection('users').document(username).delete()
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid input'}), 400

@admin_bp.route('/modify_user', methods=['POST'])
def modify_user() -> JSONResponse:
    """
    Modify a user's password in the database
    
    @Returns:
        - JSON response indicating success or failure
    """
    data = request.json

    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400
    
    username: Optional[str] = data.get('username')
    password: Optional[str] = data.get('password')
    if username and password:
        db.collection('users').document(username).update({'password': password})
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Invalid input'}), 400