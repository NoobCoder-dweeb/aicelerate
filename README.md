# Problem Statement


# Requirements
```bash
uv
python3.9+
```

# Setup
## Initial
```bash
curl -Ls https://astral.sh/uv/install.sh | sh # install uv

```

## Clone GitHub Repository
```bash
# clone
git clone https://github.com/NoobCoder-dweeb/aicelerate.git

# Prompt username
# Enter GitHub username
# Password: Enter GitHub Personal Access Token provided
cd aicelerate

# register account
git config --global credentials.helper store

# git push
# Enter GitHub username
# Password: Enter GitHub Personal Access Token provided
cd ..
```

## Init UV project
```bash
uv init aicelerate

# create virtual env
uv venv

# activate virtual env
source .venv/bin/activate

# install
uv pip install .
uv pip install .[dev]
uv sync
```

## Test
Run code
```bash
uv run main.py
```