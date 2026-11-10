#!/usr/bin/env python3
"""
Convenience launcher for the EduAlto Academic Data Pipeline.
Allows running directly as: python scripts/run_academic_pipeline.py [OPTIONS]
"""

import sys
from pathlib import Path

# Add project root to sys.path so 'scripts.academic_pipeline' is discoverable
project_root = Path(__file__).resolve().parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from scripts.academic_pipeline.cli import main

if __name__ == "__main__":
    sys.exit(main())
