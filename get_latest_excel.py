import os
import glob

downloads_path = os.path.join(os.path.expanduser("~"), "Downloads")
excel_files = glob.glob(os.path.join(downloads_path, "*.xlsx"))

if not excel_files:
    print("No Excel files found.")
else:
    latest_file = max(excel_files, key=os.path.getctime)
    print(f"Latest Excel file: {os.path.basename(latest_file)}")
