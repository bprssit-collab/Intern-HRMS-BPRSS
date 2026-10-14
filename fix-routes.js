const fs = require('fs');
const files = [
  'src/app/api/auth/me/route.ts',
  'src/app/api/auth/logout/route.ts',
  'src/app/api/settings/route.ts',
  'src/app/api/users/register-face/route.ts',
  'src/app/api/attendance/checkin/route.ts',
  'src/app/api/attendance/checkout/route.ts',
  'src/app/api/attendance/my-history/route.ts',
  'src/app/api/hrd/payout/route.ts',
  'src/app/hrd/dashboard/page.tsx',
  'src/app/hrd/layout.tsx',
  'src/app/intern/dashboard/page.tsx',
  'src/app/intern/layout.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    if (!content.includes('export const dynamic =')) {
      content = "export const dynamic = 'force-dynamic';\n" + content;
      fs.writeFileSync(f, content);
      console.log('Updated ' + f);
    }
  }
});
