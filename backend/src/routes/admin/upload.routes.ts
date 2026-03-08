import { Router, Request, Response } from 'express';
import cloudinary from '../../lib/cloudinary.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/admin/upload - Upload image to Cloudinary
// Allow upload for users with settings.edit OR banners/announcements create permissions
router.post('/', async (req: Request, res: Response) => {
    try {
        const { image, folder = 'playnex89' } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, message: 'ไม่พบรูปภาพ' });
        }

        // Determine transformation based on folder
        let transformation: any[] = [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
        ];

        // If it's a profile/logo that needs to be square, keep the 200x200 crop.
        // Banners & Announcements should keep their original aspect ratio.
        if (!['banners', 'announcements'].includes(folder)) {
            transformation.unshift({ width: 200, height: 200, crop: 'fill' });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(image, {
            folder: folder,
            resource_type: 'image',
            transformation: transformation
        });

        res.json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id
            }
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'เกิดข้อผิดพลาดในการอัพโหลด'
        });
    }
});

// DELETE /api/admin/upload/:publicId - Delete image from Cloudinary
router.delete('/:publicId', requirePermission('settings', 'general', 'manage'), async (req: Request, res: Response) => {
    try {
        const { publicId } = req.params;
        await cloudinary.uploader.destroy(publicId);
        res.json({ success: true, message: 'ลบรูปสำเร็จ' });
    } catch (error: any) {
        console.error('Delete upload error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
});

export default router;
