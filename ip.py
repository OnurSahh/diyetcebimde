import socket
import json
import os
import sys

def update_ip_files():
    # Railway URL - UPDATE THIS WITH YOUR RAILWAY URL
    RAILWAY_URL = "diyetcebimde-production.up.railway.app"
    
    # Check command line arguments
    railway_mode = 0  # Default to normal mode
    
    if len(sys.argv) > 1:
        try:
            mode = int(sys.argv[1])
            if mode == 2:
                railway_mode = 2
            else:
                railway_mode = 0
        except ValueError:
            print("[WARNING] Invalid mode argument. Using default (0)")
    
    if railway_mode == 2:
        # For Railway deployment
        ipv4_address = RAILWAY_URL
        hostname = "railway-deployment"
        mode_description = "Railway Production Mode"
        print(f"[RAILWAY MODE] Using Railway URL: https://{RAILWAY_URL}")
        
    else:
        # For development - use actual machine IP
        hostname = socket.gethostname()
        ipv4_address = socket.gethostbyname(hostname)
        server_command = f"py manage.py runserver {ipv4_address}"
        mode_description = "Development Mode"
        print(f"[DEV MODE] Using machine IP: {ipv4_address}")
    
    # Create a dictionary to store the configuration
    data = {
        "hostname": hostname, 
        "ipv4_address": ipv4_address,
        "mode": mode_description,
        "railway_mode": railway_mode
    }
    
    # Define the paths to all ipv4_address.json files
    json_paths = [
        os.path.join(os.path.dirname(__file__), "ipv4_address.json"),
        os.path.join(os.path.dirname(__file__), "frontend", "assets", "ipv4_address.json"),
        os.path.join(os.path.dirname(__file__), "backend", "ipv4_address.json")
    ]
    
    # Update each file
    updated_files = []
    
    for path in json_paths:
        try:
            # Create directory if it doesn't exist
            directory = os.path.dirname(path)
            if not os.path.exists(directory):
                os.makedirs(directory)
            
            # Write the data to the file
            with open(path, "w") as json_file:
                json.dump(data, json_file, indent=4)
            
            updated_files.append(path)
            print(f"[SUCCESS] Updated: {path}")
        except Exception as e:
            print(f"[ERROR] Error updating {path}: {e}")
    
    print(f"\n{'='*50}")
    print(f"MODE: {mode_description}")
    print(f"Address: {ipv4_address}")
    print(f"Updated {len(updated_files)} file(s)")
    print(f"{'='*50}")
    
    # Print appropriate instructions
    if railway_mode == 2:
        print(f"\n[RAILWAY] Your app is deployed at:")
        print(f"https://{RAILWAY_URL}")
        print(f"- Backend URL configured for production")
        print(f"- Database auto-configured via Railway")
    else:
        print(f"\n[DJANGO] Run your server with this command:")
        print(f"py manage.py runserver {ipv4_address}")
        print(f"\n[INFO] For development mode:")
        print(f"- Frontend connects to {ipv4_address}")
        print(f"- Use this for local development")
    
    print(f"\n[USAGE] To switch modes:")
    print(f"python ip.py 0  # Development mode (current machine IP)")
    print(f"python ip.py 2  # Railway mode (production deployment)")
    
    return ipv4_address, railway_mode

if __name__ == "__main__":
    update_ip_files()