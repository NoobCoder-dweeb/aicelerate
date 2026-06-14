from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, login_required, logout_user, current_user
from .. import db, User

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """
    Login page to authenticate users
    - GET: Render the login page
    - POST: Check the username and password, and log in the user if correct
    @Returns:
        - GET: Render the login page
        - POST: Redirect to the dashboard if login is successful, else render login page with error message
    """
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user_doc = db.collection('users').document(username).get()
        if user_doc.exists:
            user_data = user_doc.to_dict()
            if user_data.get('password') == password:
                user = User(username)
                login_user(user)
                return redirect(url_for('auth_bp.dashboard'))
            else:
                flash('Incorrect password.', 'error')
        else:
            flash('User not found.', 'error')
        return redirect(url_for('auth_bp.login'))
    return render_template('login.html')

@auth_bp.route('/dashboard')
@login_required
def dashboard():
    """
    Dashboard page for logged-in users
    """
    username = current_user.id
    # Fetch classroom count
    classroom_count = db.collection('users').document(username).collection('classrooms').stream()
    classroom_count = sum(1 for _ in classroom_count)
    # Fetch lecturer count
    lecturer_count = db.collection('users').document(username).collection('lecturers').stream()
    lecturer_count = sum(1 for _ in lecturer_count)
    # Fetch subject count
    subject_count = db.collection('users').document(username).collection('subjects').stream()
    subject_count = sum(1 for _ in subject_count)
    return render_template(
        'dashboard.html',
        classroom_count=classroom_count,
        lecturer_count=lecturer_count,
        subject_count=subject_count
    )

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """
    Logout the user and redirect to the home page
    """
    logout_user()
    return redirect(url_for('home'))