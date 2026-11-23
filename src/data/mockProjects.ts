import { Project } from '../types/taskflow';

export const mockProjects: Project[] = [
  {
    id: 'p-1',
    key: 'WEB',
    name: 'ปรับโฉมเว็บไซต์องค์กร',
    description: 'ออกแบบและพัฒนาเว็บไซต์หลักเวอร์ชันใหม่ รองรับความเร็วการโหลดและการแสดงผลทุกหน้าจอ',
    leadId: 'u-1',
    memberIds: ['u-1', 'u-2', 'u-3', 'u-5'],
    createdAt: '2026-10-12T09:00:00',
    accentColor: '#2563EB',
  },
  {
    id: 'p-2',
    key: 'MOB',
    name: 'แอปมือถือ TaskFlow iOS',
    description: 'สร้างประสบการณ์จัดการงานบนมือถือพร้อมการแจ้งเตือนแบบเรียลไทม์และโหมดออฟไลน์',
    leadId: 'u-3',
    memberIds: ['u-1', 'u-2', 'u-3', 'u-4'],
    createdAt: '2026-10-25T10:30:00',
    accentColor: '#0284C7',
  },
  {
    id: 'p-3',
    key: 'CRM',
    name: 'ระบบวิเคราะห์ข้อมูลลูกค้า',
    description: 'รวบรวมรายงานพฤติกรรมลูกค้าและสร้างแดชบอร์ดติดตามยอดขายรายไตรมาสให้ทีมการตลาด',
    leadId: 'u-4',
    memberIds: ['u-1', 'u-4', 'u-5'],
    createdAt: '2026-11-01T14:00:00',
    accentColor: '#4F46E5',
  },
  {
    id: 'p-4',
    key: 'Q4L',
    name: 'แผนเปิดตัวไตรมาส 4',
    description: 'โปรเจกต์เริ่มต้นสำหรับวางแผนกิจกรรมเปิดตัวผลิตภัณฑ์ใหม่ปลายปี (ยังไม่มีงานในระบบ)',
    leadId: 'u-1',
    memberIds: ['u-1', 'u-2'],
    createdAt: '2026-11-20T16:00:00',
    accentColor: '#0D9488',
  },
];
