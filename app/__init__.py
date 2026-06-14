from flask import Flask, render_template, request, jsonify
from flask_login import LoginManager, UserMixin, current_user, login_required
from google.cloud import firestore
import os
from dotenv import load_dotenv
from typing import Optional, Literal, cast

# load environment variables from .env file
load_dotenv(dotenv_path=os.path.join(os.getcwd(), ".env"))

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("GCLOUD_SECRET")  # read secret key from .env file

"""
1. Step to connect to Firestore
2. use CMD login your gcloud account
3. gcloud auth application-default login
"""

# Login Manager, when @login_required but not logged in, redirect to login page
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = "auth_bp.login"  # type: ignore

# Initialize Firestore client
db = firestore.Client(project="testing-54f00")


# User class
class User(UserMixin):
    """User class for Flask-Login"""

    def __init__(self, user_id):
        self.id = user_id

    @staticmethod
    def get(user_id):
        doc = db.collection("users").document(user_id).get()
        if doc.exists:
            return User(user_id)
        return None


# This function is called to load a user from the user_id stored in the session
# Which is use to @login_required
@login_manager.user_loader
def load_user(user_id: int) -> Optional[User]:
    return User.get(user_id)


# Register blueprints
from .routes.auth_routes import auth_bp
from .routes.admin_routes import admin_bp
from .routes.tagging_routes import tagging_bp
from .routes.classroom_routes import classroom_bp
from .routes.lecturer_routes import lecturer_bp
from .routes.subject_routes import subject_bp
from .routes.generate_timetable_routes import generate_timetable_bp
from .routes.settings_routes import settings_bp
from .routes.batches_routes import batches_bp

app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(tagging_bp)
app.register_blueprint(classroom_bp)
app.register_blueprint(lecturer_bp)
app.register_blueprint(subject_bp)
app.register_blueprint(generate_timetable_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(batches_bp)


@app.route("/")
def home():
    return render_template("Landing.html")  # Looks for templates/index.html


# Looks for templates/help_support.html
@app.route("/help_support")
def help_support():
    return render_template("help_support.html")
