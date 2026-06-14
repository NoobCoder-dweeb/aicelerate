# Problem Statement


# Requirements
```bash
uv
python3.9+
```

# Setup
## Initial
### Initiation WorkFlow
1. Admin invite users to "direct access" via email
2. Users accept it, git clone https://github.com/Nocturnals-Co/aicelerate.git
3. Login using own PAT

## CMD (Startup Only)
```bash
# create a SSH key
ssh-keygen -t ed25518 -C "youremail@email.com"
# Enter passphrase and !REMEMBER! it

# print SSH key
cat .ssh/id_ed25519.pub

# Copy fingerprint: ssh-ed25519 .................................. youremail@email.com
# Add ssh key to GitHub



curl -Ls https://astral.sh/uv/install.sh | sh # install uv

```

## Clone GitHub Repository
```bash
!! 1 Using HTTPS

# clone
git clone https://github.com/Nocturnals-Co/aicelerate.git


# Prompt username
# Enter GitHub username
# Password: Enter GitHub Personal Access Token provided

!! 2 Using SSH \(Recommended\)
git clone git@github.com:Nocturnals-Co/aicelerate.git

# Add ssh to Git
ssh-add -k .ssh/id_ed25519


!! Commmon step
cd aicelerate

# register account
git config --global credentials.helper store

# git push
# Enter GitHub username
# Password: Enter GitHub Personal Access Token provided

# OR enter SSH passphrase

cd ..
```

## Init UV project
```bash
# create a new project named aicelerate
uv init aicelerate

# create virtual env 
uv venv # only at the start

# Always: activate virtual env
source .venv/bin/activate # Linux

.venv/bin/activate.ps1 # Powershell 

.venv\Scripts\activate # CMD

# install (at the start)
uv pip install .
uv pip install .[dev]
uv add [your-package-name]

uv sync # most important
```

## Test
Run code
```bash
uv run app.py
```

# General workflow
1. Open in code editor (VS Code etc.)
2. Change to aicelerate directory using `cd aicelerate/` command.
3. !IMPORTANT! Run `git pull` and `git merge main` before continuing to sync changes.
4. !IMPORTANT! Change to working branch `git checkout [your-branch-name]`. Branch name must reflect the issues/tasks that the developer aims to resolve.
5. Activate the virtual environment using commands: 1. Linux = `source .venv/bin/activate`, 2. Windows = `.venv\Scripts\activate`.
6. If there is a notification of addition of new packages, run the `uv sync` command
7. Push changes to online repo using `git push` command.
8. Create a pull request in **Github** for other developers to review.
8. Repeat Steps 1-8 until issue has been resolved.