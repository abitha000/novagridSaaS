// All data in this file is SAMPLE data for the design prototype.
export type Industry = 'gym' | 'education' | 'hospital' | 'hotel'

export const industries = [
  { key: 'gym', name: 'Gym & Fitness', icon: 'Dumbbell', phase: 'Live in prototype', blurb: 'Members, renewals, attendance, trainers.' },
  { key: 'education', name: 'Schools & Colleges', icon: 'GraduationCap', phase: 'Live in prototype', blurb: 'Students, fees, transport, timetables.' },
  { key: 'hospital', name: 'Hospitals & Clinics', icon: 'Stethoscope', phase: 'Catalogue', blurb: 'Patients, appointments, queues, billing.' },
  { key: 'hotel', name: 'Hotels', icon: 'BedDouble', phase: 'Catalogue', blurb: 'Rooms, reservations, housekeeping.' },
  { key: 'restaurant', name: 'Restaurants', icon: 'UtensilsCrossed', phase: 'Catalogue', blurb: 'Tables, orders, menu, inventory.' },
  { key: 'salon', name: 'Salons & Beauty', icon: 'Scissors', phase: 'Catalogue', blurb: 'Appointments, stylists, packages.' },
  { key: 'retail', name: 'Retail & Stores', icon: 'Store', phase: 'Catalogue', blurb: 'Inventory, sales, customers.' },
  { key: 'corporate', name: 'Corporate Offices', icon: 'Building2', phase: 'Catalogue', blurb: 'Employees, leave, assets.' },
  { key: 'auto', name: 'Automotive', icon: 'Car', phase: 'Catalogue', blurb: 'Job cards, vehicles, reminders.' },
  { key: 'logistics', name: 'Logistics', icon: 'Truck', phase: 'Catalogue', blurb: 'Fleet, drivers, shipments.' },
  { key: 'tuition', name: 'Tuition & Coaching', icon: 'BookOpen', phase: 'Catalogue', blurb: 'Batches, fees, results.' },
  { key: 'pro', name: 'Professional Services', icon: 'Briefcase', phase: 'Catalogue', blurb: 'Clients, cases, time billing.' },
]

export type Org = { id: string; name: string; industry: string; owner: string; email: string; plan: string; status: string; date: string; city: string; staff: number; contacts: number }
export const orgs: Org[] = [
  { id: 'o1', name: 'Pulse Fitness Club', industry: 'Gym & Fitness', owner: 'Rohan Mehta', email: 'rohan@pulsefit.example', plan: 'Professional', status: 'Active', date: '12 Jan 2025', city: 'Pune', staff: 14, contacts: 1240 },
  { id: 'o2', name: 'St. Xavier Institute of Technology', industry: 'Schools & Colleges', owner: 'Dr. Anita Rao', email: 'anita@sxit.example', plan: 'Enterprise', status: 'Active', date: '03 Feb 2025', city: 'Mumbai', staff: 62, contacts: 8420 },
  { id: 'o3', name: 'Lotus City Hospital', industry: 'Hospitals & Clinics', owner: 'Dr. Kabir Shah', email: 'kabir@lotuscity.example', plan: 'Professional', status: 'Pending', date: '21 Mar 2025', city: 'Ahmedabad', staff: 0, contacts: 0 },
  { id: 'o4', name: 'Harbor View Hotel', industry: 'Hotels', owner: 'Meera Nair', email: 'meera@harborview.example', plan: 'Basic', status: 'Trial', date: '28 Mar 2025', city: 'Kochi', staff: 6, contacts: 220 },
  { id: 'o5', name: 'Iron Temple Gym', industry: 'Gym & Fitness', owner: 'Arjun Singh', email: 'arjun@irontemple.example', plan: 'Basic', status: 'Grace', date: '02 Apr 2025', city: 'Delhi', staff: 5, contacts: 480 },
  { id: 'o6', name: 'Bright Minds Coaching', industry: 'Tuition & Coaching', owner: 'Sneha Kulkarni', email: 'sneha@brightminds.example', plan: 'Basic', status: 'Pending', date: '09 Apr 2025', city: 'Nagpur', staff: 0, contacts: 0 },
  { id: 'o7', name: 'Spice Route Kitchen', industry: 'Restaurants', owner: 'Imran Qureshi', email: 'imran@spiceroute.example', plan: 'Basic', status: 'Suspended', date: '15 Apr 2025', city: 'Hyderabad', staff: 9, contacts: 310 },
  { id: 'o8', name: 'Greenfield Public School', industry: 'Schools & Colleges', owner: 'Priya Desai', email: 'priya@greenfield.example', plan: 'Professional', status: 'Active', date: '22 Apr 2025', city: 'Surat', staff: 38, contacts: 3100 },
  { id: 'o9', name: 'FlexZone Fitness', industry: 'Gym & Fitness', owner: 'Vikram Rao', email: 'vikram@flexzone.example', plan: 'Trial', status: 'Trial', date: '30 Apr 2025', city: 'Bengaluru', staff: 3, contacts: 64 },
]

export const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr']
export const orgGrowth = [18, 26, 31, 44, 52, 61, 75, 88, 104, 121, 139, 162]
export const revenue = [3.1, 3.8, 4.4, 5.2, 6.0, 6.9, 8.1, 9.2, 10.8, 12.4, 14.1, 16.3] // lakh INR (sample)

export const approvals = [
  { id: 'a1', org: 'Lotus City Hospital', owner: 'Dr. Kabir Shah', requested: 'Hospitals & Clinics', submitted: '2 hours ago', risk: 'Needs review', docs: 3, city: 'Ahmedabad, Gujarat', type: 'Private hospital', plan: 'Professional' },
  { id: 'a2', org: 'Bright Minds Coaching', owner: 'Sneha Kulkarni', requested: 'Tuition & Coaching', submitted: '1 day ago', risk: 'Low', docs: 2, city: 'Nagpur, Maharashtra', type: 'Coaching centre', plan: 'Basic' },
  { id: 'a3', org: 'Aurora Salon & Spa', owner: 'Tanya Bose', requested: 'Salons & Beauty', submitted: '2 days ago', risk: 'Low', docs: 2, city: 'Kolkata, West Bengal', type: 'Salon chain', plan: 'Basic' },
  { id: 'a4', org: 'Metro Movers Logistics', owner: 'Sandeep Yadav', requested: 'Gym & Fitness', submitted: '3 days ago', risk: 'Category mismatch', docs: 1, city: 'Lucknow, Uttar Pradesh', type: 'Transport company', plan: 'Professional' },
]

export const planTiers = [
  { key: 'trial', name: 'Free Trial', m: 0, y: 0, blurb: '14 days to explore your industry workspace.', limits: ['3 staff', '100 contacts', '100 messages / mo', '100 MB storage'], cta: 'Start free trial' },
  { key: 'basic', name: 'Basic', m: 1499, y: 14390, blurb: 'Core operations for a single location.', limits: ['10 staff', '1,000 contacts', '1,000 messages / mo', '2 GB storage', 'Email & WhatsApp'], cta: 'Choose Basic' },
  { key: 'pro', name: 'Professional', m: 4999, y: 47990, blurb: 'Automation, roles and deeper analytics.', limits: ['50 staff', '10,000 contacts', '10,000 messages / mo', '20 GB storage', 'Workflow automation', 'Audit logs'], cta: 'Choose Professional', featured: true },
  { key: 'ent', name: 'Enterprise', m: 0, y: 0, blurb: 'Custom limits, white-label and priority support.', limits: ['Custom staff & contacts', 'White-label included', 'Dedicated success manager', 'SSO & custom retention'], cta: 'Talk to sales' },
]
export const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

export const faqs = [
  ['Can one owner run a gym and a hotel?', 'Yes. Each business is its own organisation with a separate workspace, subscription and data. Nothing is shared between them.'],
  ['Do my customers, students or patients need an account?', 'No. Recipients never log in. They receive private WhatsApp, SMS or email messages and can manage their own consent preferences.'],
  ['Who decides which modules my organisation can use?', 'Your industry category, approved by the NOVAGRID team, decides which modules exist for you. Your plan decides which features and limits are enabled inside them.'],
  ['Will other recipients see my phone number?', 'Never. Every message is delivered individually. We do not create groups or shared contact lists.'],
  ['Is NOVAGRID a medical record system?', 'No. Hospital and clinic modules cover administration, with stricter privacy and audit controls. They do not replace a compliant EMR.'],
  ['What does white-label include?', 'Your logo, colours, name and custom domain across the workspace and message templates, available as a premium add-on.'],
]

export const members = [
  { id: 'm1', name: 'Aarav Kapoor', plan: 'Annual Elite', trainer: 'Neha Iyer', expiry: '14 Aug 2025', status: 'Active', visits: 18 },
  { id: 'm2', name: 'Diya Sharma', plan: 'Quarterly Pro', trainer: 'Karan Joshi', expiry: '02 Jun 2025', status: 'Due', visits: 11 },
  { id: 'm3', name: 'Rahul Verma', plan: 'Monthly', trainer: 'Neha Iyer', expiry: '28 May 2025', status: 'Overdue', visits: 4 },
  { id: 'm4', name: 'Ishita Menon', plan: 'Annual Elite', trainer: 'Samir Khan', expiry: '30 Nov 2025', status: 'Active', visits: 22 },
  { id: 'm5', name: 'Kabir Anand', plan: 'Quarterly Pro', trainer: 'Karan Joshi', expiry: '19 Jul 2025', status: 'Active', visits: 15 },
  { id: 'm6', name: 'Zoya Ali', plan: 'Monthly', trainer: 'Samir Khan', expiry: '05 Jun 2025', status: 'Due', visits: 9 },
  { id: 'm7', name: 'Nikhil Rao', plan: 'Annual Elite', trainer: 'Neha Iyer', expiry: '11 Dec 2025', status: 'Active', visits: 25 },
]
export const students = [
  { id: 's1', name: 'Ananya Pillai', klass: 'B.Tech CSE · Sec A', bus: 'Bus 14', guardian: 'Suresh Pillai', fee: 'Paid', att: '96%' },
  { id: 's2', name: 'Rohit Bansal', klass: 'B.Tech CSE · Sec A', bus: 'Bus 14', guardian: 'Alka Bansal', fee: 'Due', att: '88%' },
  { id: 's3', name: 'Meghna Das', klass: 'B.Tech ECE · Sec B', bus: 'Bus 14', guardian: 'Pranab Das', fee: 'Paid', att: '92%' },
  { id: 's4', name: 'Tanvi Joshi', klass: 'MBA · Sec A', bus: 'Bus 07', guardian: 'Ravi Joshi', fee: 'Paid', att: '98%' },
  { id: 's5', name: 'Yash Malhotra', klass: 'B.Tech ME · Sec A', bus: 'Bus 22', guardian: 'Sunita Malhotra', fee: 'Overdue', att: '74%' },
  { id: 's6', name: 'Fatima Sheikh', klass: 'B.Com · Sec C', bus: 'Bus 14', guardian: 'Imtiaz Sheikh', fee: 'Paid', att: '90%' },
  { id: 's7', name: 'Dev Patel', klass: 'B.Tech CSE · Sec B', bus: 'Bus 03', guardian: 'Hetal Patel', fee: 'Due', att: '85%' },
  { id: 's8', name: 'Sanya Gupta', klass: 'B.Tech ECE · Sec B', bus: 'Bus 14', guardian: 'Manoj Gupta', fee: 'Paid', att: '94%' },
]
export const busStops = [
  ['Andheri Station', '06:45', '06:40'],
  ['Powai Lake', '07:05', '06:55'],
  ['Vikhroli Junction', '07:20', '07:15'],
  ['Ghatkopar East', '07:35', '07:30'],
  ['Campus Gate 2', '08:05', '08:05'],
]
