import { User } from '../types/taskflow';

export const CURRENT_USER_ID = 'u-1';

export const mockUsers: User[] = [
  {
    id: 'u-1',
    name: 'ณัฐพล วงศ์สุวรรณ',
    role: 'Product Manager',
    accessRole: 'admin',
    email: 'nattapol@taskflow.co.th',
    initials: 'ณว',
    avatarBg: 'bg-blue-600',
    avatarText: 'text-white',
  },
  {
    id: 'u-2',
    name: 'พิมพ์ชนก รัตนไพบูลย์',
    role: 'Senior UI/UX Designer',
    accessRole: 'member',
    email: 'pimchanok@taskflow.co.th',
    initials: 'พร',
    avatarBg: 'bg-sky-700',
    avatarText: 'text-white',
  },
  {
    id: 'u-3',
    name: 'ธนกร เจริญกิจ',
    role: 'Frontend Engineer',
    accessRole: 'member',
    email: 'thanakorn@taskflow.co.th',
    initials: 'ธจ',
    avatarBg: 'bg-slate-700',
    avatarText: 'text-white',
  },
  {
    id: 'u-4',
    name: 'กมลวรรณ สิริวัฒน์',
    role: 'Backend Engineer',
    accessRole: 'member',
    email: 'kamonwan@taskflow.co.th',
    initials: 'กส',
    avatarBg: 'bg-indigo-600',
    avatarText: 'text-white',
  },
  {
    id: 'u-5',
    name: 'ศุภชัย มณีรัตน์',
    role: 'QA Lead',
    accessRole: 'member',
    email: 'supachai@taskflow.co.th',
    initials: 'ศม',
    avatarBg: 'bg-teal-700',
    avatarText: 'text-white',
  },
];
