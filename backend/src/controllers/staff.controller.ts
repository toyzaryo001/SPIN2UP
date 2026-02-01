
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/db.js';

// =======================
// ADMIN MANAGEMENT (using Admin model)
// =======================

export const getStaffList = async (req: Request, res: Response) => {
    try {
        const staff = await prisma.admin.findMany({
            select: {
                id: true,
                username: true,
                fullName: true,
                phone: true,
                isActive: true,
                isSuperAdmin: true,
                role: {
                    select: { id: true, name: true }
                },
                createdAt: true,
                lastLoginAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ success: true, data: staff });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
};

export const createStaff = async (req: Request, res: Response) => {
    try {
        const { username, password, fullName, phone, roleId, isSuperAdmin } = req.body;

        if (!username || !password || !fullName) {
            return res.status(400).json({ success: false, message: 'กรุณากรอก Username, รหัสผ่าน และชื่อ-นามสกุล' });
        }

        // Check if username already exists
        const existingAdmin = await prisma.admin.findUnique({ where: { username } });
        if (existingAdmin) {
            return res.status(400).json({ success: false, message: 'Username นี้มีอยู่แล้ว' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newStaff = await prisma.admin.create({
            data: {
                username,
                password: hashedPassword,
                fullName,
                phone: phone || null,
                roleId: roleId ? parseInt(roleId) : null,
                isSuperAdmin: isSuperAdmin || false,
            }
        });

        // Log action
        try {
            // @ts-ignore
            const adminId = req.user?.userId;
            if (adminId) {
                await prisma.adminLog.create({
                    data: {
                        adminId,
                        action: 'CREATE',
                        resource: 'STAFF',
                        details: `Created admin: ${username}`,
                        ip: req.ip || 'unknown'
                    }
                });
            }
        } catch (logError) {
            console.error('Failed to create admin log:', logError);
        }

        res.json({ success: true, data: newStaff, message: 'สร้างพนักงานสำเร็จ' });
    } catch (error) {
        console.error('Create staff error:', error);
        res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการสร้างพนักงาน' });
    }
};

export const updateStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { fullName, phone, roleId, isActive, password, isSuperAdmin } = req.body;

        const dataToUpdate: any = {};
        if (fullName !== undefined) dataToUpdate.fullName = fullName;
        if (phone !== undefined) dataToUpdate.phone = phone;
        if (roleId !== undefined) dataToUpdate.roleId = roleId ? parseInt(roleId) : null;
        if (isActive !== undefined) dataToUpdate.isActive = isActive;
        if (isSuperAdmin !== undefined) dataToUpdate.isSuperAdmin = isSuperAdmin;
        if (password && password.trim() !== "") {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        const updatedStaff = await prisma.admin.update({
            where: { id: parseInt(id) },
            data: dataToUpdate
        });

        res.json({ success: true, data: updatedStaff });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update staff failed', error });
    }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.admin.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: "Staff deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Delete staff failed', error });
    }
};

// =======================
// ROLES
// =======================

export const getRoles = async (req: Request, res: Response) => {
    try {
        const roles = await prisma.adminRole.findMany({
            include: { _count: { select: { admins: true } } }
        });
        res.json({ success: true, data: roles });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error });
    }
};

export const createRole = async (req: Request, res: Response) => {
    try {
        const { name, description, permissions } = req.body;
        const newRole = await prisma.adminRole.create({
            data: {
                name,
                description,
                permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions)
            }
        });
        res.json({ success: true, data: newRole });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Create role failed', error });
    }
};

export const updateRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const updatedRole = await prisma.adminRole.update({
            where: { id: parseInt(id) },
            data: {
                name,
                description,
                permissions: typeof permissions === 'string' ? permissions : JSON.stringify(permissions)
            }
        });
        res.json({ success: true, data: updatedRole });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Update role failed', error });
    }
};

export const deleteRole = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.adminRole.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: "Role deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Delete role failed', error });
    }
};

// =======================
// ADMIN LOGS
// =======================

export const getAdminLogs = async (req: Request, res: Response) => {
    try {
        const logs = await prisma.adminLog.findMany({
            include: {
                admin: { select: { username: true, fullName: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, data: logs });
    } catch (error: any) {
        console.error('Get admin logs error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error?.message || 'Unknown error' });
    }
};
