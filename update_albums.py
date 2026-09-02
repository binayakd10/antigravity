#!/usr/bin/env python3
import os
import subprocess
import urllib.parse
import json

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
ASSETS_DIR = os.path.join(WORKSPACE_DIR, "assets")
DHORPATAN_DIR = os.path.join(ASSETS_DIR, "dhorpatan")
NORTH_ABC_DIR = os.path.join(ASSETS_DIR, "north abc") if os.path.exists(os.path.join(ASSETS_DIR, "north abc")) else os.path.join(ASSETS_DIR, "north_abc")

IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'}
HEIC_EXTS = {'.heic', '.heif'}
VIDEO_EXTS = {'.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'}

def convert_heic_images(folder_path):
    """Convert HEIC/HEIF files to standard JPG using macOS sips tool so all browsers render them."""
    if not os.path.exists(folder_path):
        return
    for f in os.listdir(folder_path):
        lower_f = f.lower()
        if any(lower_f.endswith(ext) for ext in HEIC_EXTS):
            src_path = os.path.join(folder_path, f)
            base_name = f
            for ext in ['.HEIC.heif', '.heic.heif', '.HEIC', '.heic', '.heif']:
                if base_name.endswith(ext):
                    base_name = base_name[:-len(ext)]
                    break
            jpg_name = base_name + ".jpg"
            dst_path = os.path.join(folder_path, jpg_name)
            
            if not os.path.exists(dst_path):
                print(f"Converting {f} -> {jpg_name}...")
                subprocess.run(['sips', '-s', 'format', 'jpeg', src_path, '--out', dst_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def format_caption(filename, prefix="Expedition"):
    name = os.path.splitext(filename)[0]
    for ext in ['.HEIC.heif', '.heic.heif', '.HEIC', '.heic', '.heif']:
        if name.endswith(ext):
            name = name[:-len(ext)]
    clean = name.replace('_', ' ').replace('-', ' ').strip()
    return f"{prefix} • {clean}"

def scan_folder(folder_path, default_location, prefix):
    if not os.path.exists(folder_path):
        return []
    
    files = sorted(os.listdir(folder_path))
    media_items = []
    
    for f in files:
        if f.startswith('.'):
            continue
        lower_f = f.lower()
        # Skip raw HEIC if we have the converted JPG
        if any(lower_f.endswith(ext) for ext in HEIC_EXTS):
            continue
            
        ext = os.path.splitext(f)[1].lower()
        full_path = os.path.join(folder_path, f)
        
        rel_path = os.path.relpath(full_path, WORKSPACE_DIR)
        # URL encode path segments for web URLs
        parts = rel_path.split(os.sep)
        encoded_rel_path = "/".join(urllib.parse.quote(part) for part in parts)
        
        size_mb = os.path.getsize(full_path) / (1024 * 1024)
        
        if ext in IMAGE_EXTS:
            media_items.append({
                'type': 'image',
                'filename': f,
                'path': encoded_rel_path,
                'raw_path': rel_path,
                'caption': format_caption(f, prefix),
                'location': default_location,
                'size': f"{size_mb:.2f} MB"
            })
        elif ext in VIDEO_EXTS:
            media_items.append({
                'type': 'video',
                'filename': f,
                'path': encoded_rel_path,
                'raw_path': rel_path,
                'caption': format_caption(f, prefix),
                'location': default_location,
                'size': f"{size_mb:.2f} MB"
            })
            
    return media_items

if __name__ == "__main__":
    # 1. Convert HEIC in both directories
    convert_heic_images(DHORPATAN_DIR)
    convert_heic_images(NORTH_ABC_DIR)
    
    # 2. Scan Dhorpatan
    dhorpatan_media = scan_folder(DHORPATAN_DIR, "Dhorpatan Reserve • 2,900m", "Dhorpatan")
    dhorpatan_static = [
        {
            'type': 'image',
            'path': 'assets/binayak_dhorpatan.jpg',
            'caption': 'High Altitude Alpine Pasture & Sheep Herd • Dhorpatan',
            'location': 'Dhorpatan Highlands',
            'size': 'Original'
        }
    ] + dhorpatan_media
    
    with open(os.path.join(ASSETS_DIR, "dhorpatan_media.json"), "w") as f:
        json.dump(dhorpatan_static, f, indent=2)
    print(f"Exported Dhorpatan: {len(dhorpatan_static)} items to assets/dhorpatan_media.json")
    
    # 3. Scan North ABC
    north_abc_media = scan_folder(NORTH_ABC_DIR, "North ABC • 4,190m", "North ABC")
    north_abc_static = [
        {
            'type': 'image',
            'path': 'assets/binayak_annapurna.jpg',
            'caption': 'North Annapurna Base Camp (4,190m) Landmark Sign',
            'location': 'North ABC, Myagdi',
            'size': 'Original'
        }
    ] + north_abc_media
    
    with open(os.path.join(ASSETS_DIR, "north_abc_media.json"), "w") as f:
        json.dump(north_abc_static, f, indent=2)
    print(f"Exported North ABC: {len(north_abc_static)} items to assets/north_abc_media.json")
