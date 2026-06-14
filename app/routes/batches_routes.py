"""
Batch Routes - Handle subject batch management for timetable generation
"""

from flask import Blueprint, render_template, request, jsonify, Response
from flask_login import login_required, current_user
from .. import db
from typing import Union
from ..utils.logger import logger
import csv
from io import StringIO
from datetime import datetime

batches_bp = Blueprint("batches_bp", __name__)
JSONResponse = Union[Response, tuple[Response, int]]


@batches_bp.route("/batches")
@login_required
def batches():
    """Display batches page with all user's batches"""
    try:
        username = current_user.id

        # Fetch all batches for current user (sorted by name)
        batches_list = []
        batches_ref = (
            db.collection("users")
            .document(username)
            .collection("batches")
            .order_by("name")
        )
        for doc in batches_ref.stream():
            batch = doc.to_dict()
            batch["id"] = doc.id
            batches_list.append(batch)

        # Fetch all subjects for subject selection in modal
        subjects = []
        subjects_ref = db.collection("users").document(username).collection("subjects")
        for doc in subjects_ref.stream():
            subject = doc.to_dict()
            subject["id"] = doc.id
            subjects.append(subject)

        logger.info(f"Retrieved {len(batches_list)} batches for user {username}")

        return render_template("batches.html", batches=batches_list, subjects=subjects)

    except Exception as e:
        logger.error(f"Error loading batches page: {str(e)}", exc_info=True)
        return render_template("error.html", message="Error loading batches")


@batches_bp.route("/api/batches/add", methods=["POST"])
@login_required
def add_batch() -> JSONResponse:
    """Add a new batch"""
    try:
        username = current_user.id
        data = request.get_json()

        batch_name = data.get("name", "").strip()
        subjects = data.get("subjects", [])

        # Validation
        if not batch_name:
            return jsonify({"success": False, "message": "Batch name is required"}), 400

        if not subjects or len(subjects) == 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "At least one subject must be selected",
                    }
                ),
                400,
            )

        # Create batch document
        batch_data = {
            "name": batch_name,
            "subjects": subjects,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "subject_count": len(subjects),
        }

        # Add to Firestore
        batches_ref = db.collection("users").document(username).collection("batches")
        doc_ref = batches_ref.document()
        doc_ref.set(batch_data)

        logger.info(f"Batch '{batch_name}' created for user {username}")

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Batch created successfully",
                    "batch_id": doc_ref.id,
                }
            ),
            201,
        )

    except Exception as e:
        logger.error(f"Error adding batch: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error creating batch: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches/<batch_id>/update", methods=["POST"])
@login_required
def update_batch(batch_id: str) -> JSONResponse:
    """Update an existing batch"""
    try:
        username = current_user.id
        data = request.get_json()

        batch_name = data.get("name", "").strip()
        subjects = data.get("subjects", [])

        # Validation
        if not batch_name:
            return jsonify({"success": False, "message": "Batch name is required"}), 400

        if not subjects or len(subjects) == 0:
            return (
                jsonify(
                    {
                        "success": False,
                        "message": "At least one subject must be selected",
                    }
                ),
                400,
            )

        # Update batch document
        batch_data = {
            "name": batch_name,
            "subjects": subjects,
            "updated_at": datetime.now().isoformat(),
            "subject_count": len(subjects),
        }

        batches_ref = db.collection("users").document(username).collection("batches")
        batches_ref.document(batch_id).update(batch_data)

        logger.info(f"Batch '{batch_id}' updated for user {username}")

        return jsonify({"success": True, "message": "Batch updated successfully"}), 200

    except Exception as e:
        logger.error(f"Error updating batch: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error updating batch: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches/<batch_id>/delete", methods=["POST"])
@login_required
def delete_batch(batch_id: str) -> JSONResponse:
    """Delete a batch"""
    try:
        username = current_user.id

        batches_ref = db.collection("users").document(username).collection("batches")
        batches_ref.document(batch_id).delete()

        logger.info(f"Batch '{batch_id}' deleted for user {username}")

        return jsonify({"success": True, "message": "Batch deleted successfully"}), 200

    except Exception as e:
        logger.error(f"Error deleting batch: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error deleting batch: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches/bulk-delete", methods=["POST"])
@login_required
def bulk_delete_batches() -> JSONResponse:
    """Delete multiple batches"""
    try:
        username = current_user.id
        data = request.get_json()
        batch_ids = data.get("ids", [])

        if not batch_ids:
            return jsonify({"success": False, "message": "No batches selected"}), 400

        batches_ref = db.collection("users").document(username).collection("batches")

        for batch_id in batch_ids:
            batches_ref.document(batch_id).delete()

        logger.info(f"Deleted {len(batch_ids)} batches for user {username}")

        return (
            jsonify(
                {
                    "success": True,
                    "message": f"{len(batch_ids)} batch(es) deleted successfully",
                }
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error bulk deleting batches: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error deleting batches: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches/upload-csv", methods=["POST"])
@login_required
def upload_batches_csv() -> JSONResponse:
    """Upload batches from CSV file"""
    try:
        username = current_user.id

        # Check if file is provided
        if "file" not in request.files:
            return jsonify({"success": False, "message": "No file provided"}), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({"success": False, "message": "No file selected"}), 400

        assert file.filename is not None

        if not file.filename.endswith(".csv"):
            return (
                jsonify({"success": False, "message": "Only CSV files are allowed"}),
                400,
            )

        # Check file size (5MB max)
        file.seek(0, 2)
        file_size = file.tell()
        if file_size > 5 * 1024 * 1024:
            return (
                jsonify({"success": False, "message": "File size exceeds 5MB limit"}),
                400,
            )

        file.seek(0)

        # Parse CSV
        stream = StringIO(file.read().decode("utf-8"), newline=None)
        csv_reader = csv.reader(stream)

        batches_ref = db.collection("users").document(username).collection("batches")
        imported_count = 0
        errors = []

        for row_num, row in enumerate(csv_reader, 1):
            try:
                if not row or len(row) < 2:
                    errors.append(
                        f"Row {row_num}: Invalid format (need batch name + at least 1 subject)"
                    )
                    continue

                batch_name = row[0].strip()
                subjects = [s.strip() for s in row[1:] if s.strip()]

                if not batch_name or not subjects:
                    errors.append(f"Row {row_num}: Batch name or subjects missing")
                    continue

                batch_data = {
                    "name": batch_name,
                    "subjects": subjects,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat(),
                    "subject_count": len(subjects),
                }

                batches_ref.document().set(batch_data)
                imported_count += 1

            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")

        logger.info(f"Imported {imported_count} batches for user {username}")

        response = {
            "success": True,
            "message": f"Successfully imported {imported_count} batch(es)",
            "imported_count": imported_count,
        }

        if errors:
            response["warnings"] = errors

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error uploading batches CSV: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error uploading CSV: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches/<batch_id>", methods=["GET"])
@login_required
def get_batch(batch_id: str) -> JSONResponse:
    """Get a specific batch details"""
    try:
        username = current_user.id

        batches_ref = db.collection("users").document(username).collection("batches")
        doc = batches_ref.document(batch_id).get()

        if not doc.exists:
            return jsonify({"success": False, "message": "Batch not found"}), 404

        batch = doc.to_dict()
        batch["id"] = doc.id

        return jsonify({"success": True, "data": batch}), 200

    except Exception as e:
        logger.error(f"Error fetching batch: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error fetching batch: {str(e)}"}),
            500,
        )


@batches_bp.route("/api/batches", methods=["GET"])
@login_required
def get_all_batches() -> JSONResponse:
    """Get all batches for current user"""
    try:
        username = current_user.id

        batches_list = []
        batches_ref = (
            db.collection("users")
            .document(username)
            .collection("batches")
            .order_by("name")
        )

        for doc in batches_ref.stream():
            batch = doc.to_dict()
            batch["id"] = doc.id
            batches_list.append(batch)

        return (
            jsonify(
                {"success": True, "data": batches_list, "count": len(batches_list)}
            ),
            200,
        )

    except Exception as e:
        logger.error(f"Error fetching batches: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "message": f"Error fetching batches: {str(e)}"}),
            500,
        )
