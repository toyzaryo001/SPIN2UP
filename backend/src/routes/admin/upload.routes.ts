import { Router, Request, Response } from 'express';
import cloudinary from '../../lib/cloudinary.js';
import { requirePermission } from '../../middlewares/auth.middleware.js';

const router = Router();

// POST /api/admin/upload - Upload image to Cloudinary
router.post('/', requirePermission('settings', 'edit'), async (req: Request, res: Response) => {
    try {
        const { image, folder = 'playnex89' } = req.body;

        if (!image) {
            return res.status(400).json({ success: false, message: 'ไม่พบรูปภาพ' });
        }

        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(image, {
            folder: folder,
            resource_type: 'image',
            transformation: [
                { width: 200, height: 200, crop: 'fill' },
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
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
router.delete('/:publicId', requirePermission('settings', 'edit'), async (req: Request, res: Response) => {
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
