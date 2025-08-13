import socket
import json
import os
import sys

def update_ip_files():
    # Check if Railway mode is enabled
    railway_mode = 2  # Set to 2 for Railway deployment
    apk_mode = 1      # Set to 1 for APK/Android emulator, 0 for development
    
    # Check command line arguments
    if len(sys.argv) > 1:
        try:
            mode = int(sys.argv[1])
            if mode == 2:
                railway_mode = 2
                apk_mode = 0
            elif mode == 1:
                railway_mode = 0
                apk_mode = 1
            else:
                railway_mode = 0
                apk_mode = 0
        except ValueError:
            print("[WARNING] Invalid mode argument. Using default (0)")
    
    if railway_mode == 2:
        # For Railway deployment
        railway_url = input("Enter your Railway app URL (e.g., yourapp-production-xxxx.up.railway.app): ")
        if not railway_url.startswith('http'):
            railway_url = f"https://{railway_url}"
        
        ipv4_address = railway_url.replace('https://', '').replace('http://', '')
        hostname = "railway-deployment"
        server_command = "Railway handles server automatically"
        mode_description = "Railway Production Mode"
        print(f"[RAILWAY MODE] Using Railway URL: {railway_url}")
        
    elif apk_mode == 1:
        # For Android emulator/APK - use special IP
        ipv4_address = "10.0.2.2"
        hostname = "android-emulator"
        server_command = f"py manage.py runserver 0.0.0.0:8000"
        mode_description = "APK/Android Emulator Mode"
        print(f"[APK MODE] Using Android emulator IP: {ipv4_address}")
    else:
        # For development - use actual machine IP
        hostname = socket.gethostname()
        ipv4_address = socket.gethostbyname(hostname)
        server_command = f"py manage.py runserver {ipv4_address}:8000"
        mode_description = "Development Mode"
        print(f"[DEV MODE] Using machine IP: {ipv4_address}")
    
    # Create a dictionary to store the configuration
    data = {
        "hostname": hostname, 
        "ipv4_address": ipv4_address,
        "mode": mode_description,
        "apk_mode": apk_mode,
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
        print(f"\n[RAILWAY] Your app will be deployed to:")
        print(f"https://{ipv4_address}")
        print(f"- Set environment variables in Railway dashboard")
        print(f"- Database will be auto-configured")
    elif apk_mode == 1:
        print(f"\n[DJANGO] Run your server with this command:")
        print(f"{server_command}")
        print(f"\n[IMPORTANT] For APK mode:")
        print(f"- Use 0.0.0.0:8000 to bind Django to all interfaces")
        print(f"- Android emulator will connect via 10.0.2.2:8000")
        print(f"- Make sure Windows Firewall allows port 8000")
    else:
        print(f"\n[DJANGO] Run your server with this command:")
        print(f"{server_command}")
        print(f"\n[INFO] For development mode:")
        print(f"- Frontend connects directly to {ipv4_address}:8000")
        print(f"- Use this for Expo Go on same network")
    
    print(f"\n[USAGE] To switch modes:")
    print(f"python ip.py 0  # Development mode (current machine IP)")
    print(f"python ip.py 1  # APK mode (Android emulator IP)")
    print(f"python ip.py 2  # Railway mode (production deployment)")
    
    return ipv4_address, railway_mode

if __name__ == "__main__":
    update_ip_files()