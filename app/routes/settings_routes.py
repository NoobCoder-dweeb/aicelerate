from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Optional, Union

settings_bp = Blueprint('settings_bp', __name__, url_prefix='/settings')
JSONResponse = Union[Response, tuple[Response, int]]

@settings_bp.route('/')
@login_required
def settings():
    return render_template('settings.html', user=current_user)

# ✅ Handle password update (Firestore-based)
@settings_bp.route('/update_password', methods=['POST'])
@login_required
def update_password():
    data = request.get_json()
    current_password = data.get("current_password")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not current_password or not new_password or not confirm_password:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    if new_password != confirm_password:
        return jsonify({"success": False, "message": "New passwords do not match"}), 400

    if len(new_password) < 8:
        return jsonify({"success": False, "message": "Password must be at least 8 characters"}), 400

    # 🔑 Get user doc from Firestore
    user_ref = db.collection('users').document(current_user.id)
    user_doc = user_ref.get()

    if not user_doc.exists:
        return jsonify({"success": False, "message": "User not found"}), 404

    user_data = user_doc.to_dict()
    stored_password = user_data.get("password")

    # Check current password (⚠️ plaintext since your friend also used plaintext in Firestore)
    if stored_password != current_password:
        return jsonify({"success": False, "message": "Current password is incorrect"}), 400

    # Update Firestore
    user_ref.update({"password": new_password})

    return jsonify({"success": True, "message": "Password updated successfully"})