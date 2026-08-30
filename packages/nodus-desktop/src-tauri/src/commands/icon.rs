// Nodus Desktop — Win32 Icon Extractor
// Extracts application icons from Windows executables using Shell API.
// Returns icons as base64-encoded PNG data URIs for cross-device transfer.

#[cfg(windows)]
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

#[cfg(windows)]
use windows::Win32::UI::Shell::{SHGetFileInfoW, SHFILEINFOW, SHGFI_ICON, SHGFI_LARGEICON};
#[cfg(windows)]
use windows::Win32::UI::WindowsAndMessaging::{DestroyIcon, GetIconInfo, ICONINFO};
#[cfg(windows)]
use windows::Win32::Graphics::Gdi::{
    CreateCompatibleDC, DeleteDC, DeleteObject, GetDIBits, SelectObject,
    BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
};
#[cfg(windows)]
use windows::Win32::Storage::FileSystem::FILE_FLAGS_AND_ATTRIBUTES;

/// Extract icon from an executable path and return as base64 PNG data URI.
/// Returns `data:image/png;base64,...` on success.
#[cfg(windows)]
pub fn extract_exe_icon(exe_path: &str) -> Result<String, String> {
    use std::ffi::OsStr;
    use std::os::windows::ffi::OsStrExt;

    // Convert path to wide string
    let wide_path: Vec<u16> = OsStr::new(exe_path)
        .encode_wide()
        .chain(std::iter::once(0))
        .collect();

    let mut shfi = SHFILEINFOW::default();
    let shfi_size = std::mem::size_of::<SHFILEINFOW>() as u32;

    unsafe {
        let result = SHGetFileInfoW(
            windows::core::PCWSTR(wide_path.as_ptr()),
            FILE_FLAGS_AND_ATTRIBUTES(0),
            Some(&mut shfi),
            shfi_size,
            SHGFI_ICON | SHGFI_LARGEICON,
        );

        if result == 0 || shfi.hIcon.is_invalid() {
            return Err(format!("SHGetFileInfoW failed for: {}", exe_path));
        }

        let hicon = shfi.hIcon;

        // Get icon info to access the bitmap
        let mut icon_info = ICONINFO::default();
        if GetIconInfo(hicon, &mut icon_info).is_err() {
            DestroyIcon(hicon).ok();
            return Err("GetIconInfo failed".to_string());
        }

        // Get bitmap dimensions
        let hbm_color = icon_info.hbmColor;
        if hbm_color.is_invalid() {
            if !icon_info.hbmMask.is_invalid() {
                DeleteObject(icon_info.hbmMask).ok();
            }
            DestroyIcon(hicon).ok();
            return Err("No color bitmap in icon".to_string());
        }

        // Create a compatible DC
        let hdc = CreateCompatibleDC(None);
        if hdc.is_invalid() {
            DeleteObject(hbm_color).ok();
            if !icon_info.hbmMask.is_invalid() {
                DeleteObject(icon_info.hbmMask).ok();
            }
            DestroyIcon(hicon).ok();
            return Err("CreateCompatibleDC failed".to_string());
        }

        // Query bitmap dimensions
        let mut bmp_header = BITMAPINFOHEADER {
            biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
            biWidth: 0,
            biHeight: 0,
            biPlanes: 1,
            biBitCount: 32,
            biCompression: BI_RGB.0 as u32,
            ..Default::default()
        };

        // First call to get dimensions
        let old_bmp = SelectObject(hdc, hbm_color);
        GetDIBits(
            hdc,
            hbm_color,
            0,
            0,
            None,
            &mut BITMAPINFO {
                bmiHeader: bmp_header,
                ..Default::default()
            },
            DIB_RGB_COLORS,
        );

        // Use 32x32 as icon size
        let width: i32 = 32;
        let height: i32 = 32;
        bmp_header.biWidth = width;
        bmp_header.biHeight = -height; // Top-down DIB
        bmp_header.biBitCount = 32;
        bmp_header.biCompression = BI_RGB.0 as u32;
        bmp_header.biSizeImage = (width * height * 4) as u32;

        let mut pixels: Vec<u8> = vec![0u8; (width * height * 4) as usize];

        let mut bmi = BITMAPINFO {
            bmiHeader: bmp_header,
            ..Default::default()
        };

        GetDIBits(
            hdc,
            hbm_color,
            0,
            height as u32,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // Clean up GDI objects
        SelectObject(hdc, old_bmp);
        DeleteDC(hdc).ok();
        DeleteObject(hbm_color).ok();
        if !icon_info.hbmMask.is_invalid() {
            DeleteObject(icon_info.hbmMask).ok();
        }
        DestroyIcon(hicon).ok();

        // Convert BGRA pixels to RGBA
        for chunk in pixels.chunks_exact_mut(4) {
            chunk.swap(0, 2); // B <-> R
        }

        // Encode as PNG using a simple BMP-to-PNG approach
        // We'll create a minimal PNG manually
        let png_data = encode_rgba_to_png(width as u32, height as u32, &pixels)
            .map_err(|e| format!("PNG encode failed: {}", e))?;

        let b64 = BASE64.encode(&png_data);
        Ok(format!("data:image/png;base64,{}", b64))
    }
}

/// Minimal PNG encoder for RGBA pixel data
#[cfg(windows)]
fn encode_rgba_to_png(width: u32, height: u32, rgba: &[u8]) -> Result<Vec<u8>, String> {
    use std::io::Write;

    // Build raw image data with filter byte (0 = None) per row
    let row_bytes = (width * 4) as usize;
    let mut raw_data = Vec::with_capacity((row_bytes + 1) * height as usize);
    for y in 0..height as usize {
        raw_data.push(0u8); // filter: None
        let start = y * row_bytes;
        let end = start + row_bytes;
        if end <= rgba.len() {
            raw_data.extend_from_slice(&rgba[start..end]);
        } else {
            raw_data.extend(std::iter::repeat(0u8).take(row_bytes));
        }
    }

    // Compress with deflate (zlib)
    let compressed = miniz_compress(&raw_data);

    let mut png = Vec::new();

    // PNG Signature
    png.write_all(&[137, 80, 78, 71, 13, 10, 26, 10]).map_err(|e| e.to_string())?;

    // IHDR chunk
    let mut ihdr_data = Vec::new();
    ihdr_data.extend_from_slice(&width.to_be_bytes());
    ihdr_data.extend_from_slice(&height.to_be_bytes());
    ihdr_data.push(8);  // bit depth
    ihdr_data.push(6);  // color type: RGBA
    ihdr_data.push(0);  // compression
    ihdr_data.push(0);  // filter
    ihdr_data.push(0);  // interlace
    write_png_chunk(&mut png, b"IHDR", &ihdr_data)?;

    // IDAT chunk
    write_png_chunk(&mut png, b"IDAT", &compressed)?;

    // IEND chunk
    write_png_chunk(&mut png, b"IEND", &[])?;

    Ok(png)
}

#[cfg(windows)]
fn write_png_chunk(out: &mut Vec<u8>, chunk_type: &[u8; 4], data: &[u8]) -> Result<(), String> {
    use std::io::Write;
    let len = data.len() as u32;
    out.write_all(&len.to_be_bytes()).map_err(|e| e.to_string())?;
    out.write_all(chunk_type).map_err(|e| e.to_string())?;
    out.write_all(data).map_err(|e| e.to_string())?;

    // CRC32 over chunk_type + data
    let mut crc_data = Vec::with_capacity(4 + data.len());
    crc_data.extend_from_slice(chunk_type);
    crc_data.extend_from_slice(data);
    let crc = crc32(&crc_data);
    out.write_all(&crc.to_be_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(windows)]
fn crc32(data: &[u8]) -> u32 {
    let mut crc: u32 = 0xFFFFFFFF;
    for &byte in data {
        crc ^= byte as u32;
        for _ in 0..8 {
            if crc & 1 != 0 {
                crc = (crc >> 1) ^ 0xEDB88320;
            } else {
                crc >>= 1;
            }
        }
    }
    !crc
}

/// Minimal zlib/deflate compression using store-only blocks (no real compression,
/// but produces valid zlib stream that PNG decoders accept).
#[cfg(windows)]
fn miniz_compress(data: &[u8]) -> Vec<u8> {
    let mut out = Vec::new();

    // Zlib header: CMF=0x78, FLG=0x01 (no dict, compression level 0)
    out.push(0x78);
    out.push(0x01);

    // Split into 65535-byte store blocks
    let chunks: Vec<&[u8]> = data.chunks(65535).collect();
    for (i, chunk) in chunks.iter().enumerate() {
        let is_last = i == chunks.len() - 1;
        out.push(if is_last { 0x01 } else { 0x00 }); // BFINAL + BTYPE=00 (stored)
        let len = chunk.len() as u16;
        let nlen = !len;
        out.extend_from_slice(&len.to_le_bytes());
        out.extend_from_slice(&nlen.to_le_bytes());
        out.extend_from_slice(chunk);
    }

    // Adler-32 checksum
    let adler = adler32(data);
    out.extend_from_slice(&adler.to_be_bytes());

    out
}

#[cfg(windows)]
fn adler32(data: &[u8]) -> u32 {
    let mut a: u32 = 1;
    let mut b: u32 = 0;
    for &byte in data {
        a = (a + byte as u32) % 65521;
        b = (b + a) % 65521;
    }
    (b << 16) | a
}

#[cfg(not(windows))]
pub fn extract_exe_icon(_exe_path: &str) -> Result<String, String> {
    Err("Icon extraction is only supported on Windows".to_string())
}
