import { AttendancePanel } from '@/components/attendance-panel';

export default function AttendancePage() {
  return (
    <AttendancePanel
      dashboardHref="/intern/dashboard"
      registerFaceHref="/intern/register-face"
      wrapperClassName="sm:pl-56"
    />
  );
}
