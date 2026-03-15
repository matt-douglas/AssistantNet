// AssistantNet — Simulated Business Data Layer
// Provides realistic seed data for all modules with localStorage persistence

const STORAGE_KEY = 'assistantnet_data';
const DATA_VERSION = 4;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}



function seedEmails() {
  return [
    {
      id: generateId(), from: 'Sarah Chen', email: 'sarah.chen@meridiangroup.com',
      subject: 'Q1 Revenue Report — Action Required',
      preview: 'Hi team, the Q1 numbers are in and we need to discuss the variance in the northeast region before the board meeting on Thursday...',
      body: 'Hi team,\n\nThe Q1 numbers are in and we need to discuss the variance in the northeast region before the board meeting on Thursday.\n\nKey highlights:\n- Overall revenue up 12% YoY\n- Northeast region down 3% (primarily due to delayed enterprise deals)\n- APAC exceeded targets by 18%\n- Customer retention improved to 94.2%\n\nI\'ve attached the full breakdown. Can we sync tomorrow at 2 PM to align on the narrative for the board?\n\nBest,\nSarah',
      time: '9:14 AM', priority: 'urgent', read: false, starred: true, category: 'finance',
      avatar: 'SC'
    },
    {
      id: generateId(), from: 'Marcus Webb', email: 'marcus@techvault.io',
      subject: 'Partnership Proposal — TechVault x Your Company',
      preview: 'Following our conversation at SaaStr, I wanted to formalize our integration partnership discussion...',
      body: 'Hi,\n\nFollowing our conversation at SaaStr, I wanted to formalize our integration partnership discussion.\n\nProposed terms:\n- Revenue share: 15% on referred deals\n- Joint marketing campaign (Q2 launch)\n- API integration timeline: 6 weeks\n- Dedicated partner success manager\n\nOur platform currently serves 2,400+ mid-market companies in the fintech space, and I believe a native integration would be mutually beneficial.\n\nWould love to schedule a call with your partnerships team this week.\n\nCheers,\nMarcus Webb\nVP Partnerships, TechVault',
      time: '8:47 AM', priority: 'high', read: false, starred: false, category: 'partnerships',
      avatar: 'MW'
    },
    {
      id: generateId(), from: 'Linda Park', email: 'linda.park@hr.internal',
      subject: 'New Hire Onboarding — Week of March 17',
      preview: 'We have 4 new team members starting next week. Please review the onboarding schedule and confirm room availability...',
      body: 'Hi,\n\nWe have 4 new team members starting the week of March 17:\n\n1. Alex Rivera — Senior Engineer (Platform team)\n2. Jordan Mills — Product Designer (Growth team)\n3. Priya Sharma — Data Analyst (Revenue Ops)\n4. Tom Hendricks — Account Executive (Enterprise)\n\nOnboarding schedule:\n- Monday: IT setup & orientation (9 AM - 12 PM, Conf Room B)\n- Monday: Team lunch (12:30 PM)\n- Tuesday-Wednesday: Role-specific training\n- Thursday: Cross-functional introductions\n- Friday: Week 1 check-in with hiring managers\n\nPlease confirm room availability and ensure equipment is ready.\n\nThanks,\nLinda',
      time: '8:22 AM', priority: 'medium', read: false, starred: false, category: 'hr',
      avatar: 'LP'
    },
    {
      id: generateId(), from: 'DevOps Alert', email: 'alerts@monitoring.internal',
      subject: '⚠️ Production API Latency Spike — p99 > 800ms',
      preview: 'Alert triggered at 07:45 UTC. API gateway latency exceeded threshold. Auto-scaling initiated...',
      body: 'ALERT: Production API Latency Spike\n\nTriggered: 07:45 UTC\nService: api-gateway-prod\nMetric: p99 latency > 800ms (threshold: 500ms)\nCurrent: 847ms\n\nAuto-scaling: INITIATED (scaling from 8 to 14 instances)\nDatabase: Connection pool at 78% capacity\nStatus: INVESTIGATING\n\nRecent deployments:\n- v2.14.3 deployed at 06:30 UTC (feature flags service)\n\nIncident response bot has been activated. On-call engineer notified.\n\nDashboard: https://monitoring.internal/incidents/INC-2847',
      time: '7:45 AM', priority: 'urgent', read: true, starred: true, category: 'engineering',
      avatar: '⚠️'
    },
    {
      id: generateId(), from: 'David Kim', email: 'david.kim@legal.internal',
      subject: 'Contract Review — Meridian Enterprise Agreement',
      preview: 'The legal team has completed the review of the Meridian contract. A few clauses need revision before we can proceed...',
      body: 'Hi,\n\nThe legal team has completed the review of the Meridian Enterprise Agreement (contract #ME-2024-0892).\n\nItems requiring revision:\n1. Section 4.2 — Liability cap needs to be adjusted to $2M (currently $5M)\n2. Section 7.1 — Data processing addendum needs GDPR compliance language\n3. Section 9.3 — Auto-renewal clause should be changed from 2 years to 1 year\n4. Exhibit B — SLA commitments need to align with our standard 99.9% uptime guarantee\n\nI\'ve attached the redlined version. Please review and let me know if you\'d like to discuss before sending back to Meridian\'s legal team.\n\nRegards,\nDavid Kim\nGeneral Counsel',
      time: 'Yesterday', priority: 'high', read: true, starred: false, category: 'legal',
      avatar: 'DK'
    },
    {
      id: generateId(), from: 'Emma Rodriguez', email: 'emma.r@marketing.internal',
      subject: 'Q2 Marketing Campaign Brief — Review & Approve',
      preview: 'Hey! The creative team finished the Q2 campaign brief. We\'re targeting a 30% increase in MQLs...',
      body: 'Hey!\n\nThe creative team finished the Q2 campaign brief. Here\'s the overview:\n\n🎯 Campaign: "Accelerate Everything"\nGoal: 30% increase in MQLs, 15% improvement in CAC\nBudget: $340K (up from $280K in Q1)\n\nChannels:\n- LinkedIn Ads (40% of budget)\n- Google Search (25%)\n- Content marketing / SEO (20%)\n- Events & Webinars (15%)\n\nKey dates:\n- Creative approval: March 21\n- Launch: April 1\n- Mid-campaign review: April 30\n\nThe deck is in the shared drive. Would love your sign-off by EOW!\n\nBest,\nEmma',
      time: 'Yesterday', priority: 'medium', read: true, starred: false, category: 'marketing',
      avatar: 'ER'
    },
    {
      id: generateId(), from: 'Jason Blackwell', email: 'jason.b@client-services.internal',
      subject: 'Client Escalation — Apex Financial requesting executive sponsor',
      preview: 'Apex Financial (ARR: $420K) has escalated their support ticket. They are requesting a direct meeting with leadership...',
      body: 'Hi,\n\nPriority escalation from Apex Financial (Account: #AF-1204, ARR: $420K).\n\nSituation:\n- They\'ve experienced 3 service disruptions in the past 30 days\n- Their VP of Engineering has requested a meeting with our executive team\n- They are currently evaluating competitive solutions\n- Contract renewal is in 60 days\n\nRecommended actions:\n1. Schedule executive sponsor call within 48 hours\n2. Provide root cause analysis on all 3 incidents\n3. Offer 2-month service credit\n4. Assign dedicated technical account manager\n\nThis is a retention-critical account. Please advise on next steps.\n\nJason Blackwell\nDirector, Client Services',
      time: 'Yesterday', priority: 'urgent', read: false, starred: true, category: 'clients',
      avatar: 'JB'
    },
    {
      id: generateId(), from: 'Newsletter', email: 'digest@techcrunch.com',
      subject: 'TechCrunch Daily — AI Funding Hits Record $14B in Q1',
      preview: 'Today\'s top stories: AI investments surge, new EU tech regulations, startup acquisition roundup...',
      body: 'TechCrunch Daily Digest\n\n📰 Top Stories:\n\n1. AI Funding Hits Record $14B in Q1 2026\nVenture capital firms poured $14 billion into AI startups in Q1, marking a 45% increase from Q4 2025.\n\n2. EU Finalizes New Tech Regulations\nThe European Commission approved sweeping new regulations targeting AI transparency and data sovereignty.\n\n3. Startup Acquisition Roundup\n- Salesforce acquires DataSync for $2.1B\n- Microsoft invests $500M in autonomous coding startup\n- Google leads $300M round for healthcare AI platform',
      time: '2 days ago', priority: 'low', read: true, starred: false, category: 'news',
      avatar: '📰'
    }
  ];
}

function seedMeetings() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  function getDateForDay(dayOffset) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + dayOffset);
    return d.toISOString().split('T')[0];
  }

  return [
    { id: generateId(), title: 'Weekly Standup', date: getDateForDay(0), startTime: '09:00', endTime: '09:30', attendees: ['Sarah C.', 'Marcus W.', 'Team'], category: 'team', location: 'Zoom', recurring: true },
    { id: generateId(), title: 'Board Prep — Q1 Review', date: getDateForDay(0), startTime: '14:00', endTime: '15:30', attendees: ['Sarah C.', 'David K.', 'CFO'], category: 'executive', location: 'Boardroom A', recurring: false },
    { id: generateId(), title: 'Engineering Architecture Review', date: getDateForDay(1), startTime: '10:00', endTime: '11:00', attendees: ['CTO', 'Platform Team'], category: 'engineering', location: 'Conf Room B', recurring: false },
    { id: generateId(), title: 'TechVault Partnership Call', date: getDateForDay(1), startTime: '13:00', endTime: '14:00', attendees: ['Marcus W.', 'Partnerships'], category: 'external', location: 'Google Meet', recurring: false },
    { id: generateId(), title: 'Marketing Sync', date: getDateForDay(2), startTime: '11:00', endTime: '11:45', attendees: ['Emma R.', 'Growth Team'], category: 'marketing', location: 'Zoom', recurring: true },
    { id: generateId(), title: 'Apex Financial — Exec Sponsor Call', date: getDateForDay(2), startTime: '15:00', endTime: '16:00', attendees: ['Jason B.', 'VP Sales', 'CTO'], category: 'clients', location: 'Zoom', recurring: false },
    { id: generateId(), title: '1:1 with Direct Report', date: getDateForDay(3), startTime: '09:30', endTime: '10:00', attendees: ['Alex R.'], category: 'team', location: 'Office', recurring: true },
    { id: generateId(), title: 'Product Roadmap Planning', date: getDateForDay(3), startTime: '14:00', endTime: '16:00', attendees: ['Product Team', 'Engineering Leads'], category: 'product', location: 'Conf Room A', recurring: false },
    { id: generateId(), title: 'Company All-Hands', date: getDateForDay(4), startTime: '16:00', endTime: '17:00', attendees: ['Everyone'], category: 'company', location: 'Main Hall / Zoom', recurring: true },
    { id: generateId(), title: 'New Hire Welcome Lunch', date: getDateForDay(0), startTime: '12:30', endTime: '13:30', attendees: ['New Hires', 'HR Team', 'Hiring Managers'], category: 'hr', location: 'Cafeteria', recurring: false },
  ];
}

function seedTasks() {
  return [
    { id: generateId(), title: 'Review Q1 revenue report and prepare board talking points', status: 'in-progress', priority: 'urgent', assignee: 'You', dueDate: 'Mar 16', tags: ['finance', 'board'], subtasks: [
      { title: 'Analyze northeast region variance', done: true },
      { title: 'Prepare narrative slides', done: false },
      { title: 'Get CFO sign-off', done: false }
    ]},
    { id: generateId(), title: 'Respond to TechVault partnership proposal', status: 'todo', priority: 'high', assignee: 'You', dueDate: 'Mar 17', tags: ['partnerships'], subtasks: [
      { title: 'Review proposed terms', done: true },
      { title: 'Get legal review on rev share', done: false },
      { title: 'Schedule partnership call', done: false }
    ]},
    { id: generateId(), title: 'Resolve Apex Financial escalation', status: 'in-progress', priority: 'urgent', assignee: 'Jason B.', dueDate: 'Mar 15', tags: ['clients', 'retention'], subtasks: [
      { title: 'Prepare root cause analysis', done: true },
      { title: 'Schedule exec sponsor call', done: true },
      { title: 'Approve service credit', done: false }
    ]},
    { id: generateId(), title: 'Approve Q2 marketing campaign brief', status: 'todo', priority: 'medium', assignee: 'You', dueDate: 'Mar 21', tags: ['marketing'], subtasks: [] },
    { id: generateId(), title: 'Review Meridian contract redlines', status: 'todo', priority: 'high', assignee: 'David K.', dueDate: 'Mar 18', tags: ['legal', 'contracts'], subtasks: [] },
    { id: generateId(), title: 'Prepare new hire onboarding materials', status: 'in-progress', priority: 'medium', assignee: 'Linda P.', dueDate: 'Mar 16', tags: ['hr', 'onboarding'], subtasks: [
      { title: 'IT equipment checklist', done: true },
      { title: 'Training schedule finalized', done: true },
      { title: 'Room bookings confirmed', done: false }
    ]},
    { id: generateId(), title: 'Investigate API latency spike — INC-2847', status: 'in-progress', priority: 'urgent', assignee: 'Platform Team', dueDate: 'Mar 14', tags: ['engineering', 'incident'], subtasks: [
      { title: 'Auto-scaling verified', done: true },
      { title: 'Root cause identified', done: false },
      { title: 'Post-mortem scheduled', done: false }
    ]},
    { id: generateId(), title: 'Update investor deck with Q1 metrics', status: 'todo', priority: 'medium', assignee: 'You', dueDate: 'Mar 25', tags: ['finance', 'investor-relations'], subtasks: [] },
    { id: generateId(), title: 'Plan Q2 OKRs', status: 'backlog', priority: 'medium', assignee: 'Leadership', dueDate: 'Mar 28', tags: ['strategy'], subtasks: [] },
    { id: generateId(), title: 'Security audit remediation items', status: 'backlog', priority: 'high', assignee: 'Security Team', dueDate: 'Apr 1', tags: ['security', 'compliance'], subtasks: [] },
    { id: generateId(), title: 'Evaluate CRM migration options', status: 'done', priority: 'medium', assignee: 'You', dueDate: 'Mar 10', tags: ['operations'], subtasks: [] },
    { id: generateId(), title: 'Complete annual compliance training', status: 'done', priority: 'low', assignee: 'You', dueDate: 'Mar 12', tags: ['compliance'], subtasks: [] },
  ];
}

function seedDocuments() {
  return [
    { id: generateId(), name: 'Q1 Revenue Report 2026', type: 'spreadsheet', size: '2.4 MB', modified: 'Today', owner: 'Sarah Chen', shared: true, category: 'finance' },
    { id: generateId(), name: 'TechVault Partnership Agreement', type: 'document', size: '340 KB', modified: 'Today', owner: 'Legal', shared: false, category: 'legal' },
    { id: generateId(), name: 'Q2 Marketing Campaign Brief', type: 'presentation', size: '8.7 MB', modified: 'Yesterday', owner: 'Emma Rodriguez', shared: true, category: 'marketing' },
    { id: generateId(), name: 'Meridian Enterprise Contract (Redlined)', type: 'pdf', size: '1.1 MB', modified: 'Yesterday', owner: 'David Kim', shared: false, category: 'legal' },
    { id: generateId(), name: 'Product Roadmap 2026', type: 'presentation', size: '12.3 MB', modified: '2 days ago', owner: 'Product Team', shared: true, category: 'product' },
    { id: generateId(), name: 'New Hire Onboarding Checklist', type: 'document', size: '156 KB', modified: '2 days ago', owner: 'Linda Park', shared: true, category: 'hr' },
    { id: generateId(), name: 'API Architecture Diagram', type: 'image', size: '4.2 MB', modified: '3 days ago', owner: 'Engineering', shared: true, category: 'engineering' },
    { id: generateId(), name: 'Incident Postmortem — INC-2801', type: 'document', size: '89 KB', modified: '4 days ago', owner: 'Platform Team', shared: true, category: 'engineering' },
    { id: generateId(), name: 'Employee Handbook 2026', type: 'pdf', size: '3.8 MB', modified: '1 week ago', owner: 'HR', shared: true, category: 'hr' },
    { id: generateId(), name: 'Investor Update — March 2026', type: 'presentation', size: '6.1 MB', modified: '1 week ago', owner: 'CEO', shared: false, category: 'finance' },
    { id: generateId(), name: 'Security Audit Report Q4', type: 'pdf', size: '2.9 MB', modified: '2 weeks ago', owner: 'Security Team', shared: false, category: 'security' },
    { id: generateId(), name: 'Brand Guidelines v3', type: 'pdf', size: '18.4 MB', modified: '3 weeks ago', owner: 'Design', shared: true, category: 'marketing' },
  ];
}

function seedKPIs() {
  return {
    revenue: { value: 4280000, change: 12.4, label: 'Q1 Revenue', prefix: '$', format: 'currency' },
    tasksCompleted: { value: 147, change: 8.2, label: 'Tasks Completed', prefix: '', format: 'number' },
    emailsHandled: { value: 1284, change: -3.1, label: 'Emails Processed', prefix: '', format: 'number' },
    meetingsToday: { value: 6, change: 0, label: 'Meetings Today', prefix: '', format: 'number' },
    clientSatisfaction: { value: 94.2, change: 2.1, label: 'Client Satisfaction', prefix: '', suffix: '%', format: 'percent' },
    teamUtilization: { value: 87, change: 5.0, label: 'Team Utilization', prefix: '', suffix: '%', format: 'percent' },
  };
}

function seedActivityLog() {
  return [
    { id: generateId(), text: 'Triaged 12 incoming emails', time: '3 min ago', icon: '📧', badge: 'auto' },
    { id: generateId(), text: 'Drafted reply to Sarah Chen re: Q1 Revenue Report', time: '8 min ago', icon: '✍️', badge: 'auto' },
    { id: generateId(), text: 'Rescheduled Engineering Review (conflict detected)', time: '15 min ago', icon: '📅', badge: 'auto' },
    { id: generateId(), text: 'Created 3 subtasks for "Board Prep"', time: '22 min ago', icon: '✅', badge: 'auto' },
    { id: generateId(), text: 'Summarized TechVault Partnership Agreement (4 pages → key terms)', time: '35 min ago', icon: '📄', badge: 'auto' },
    { id: generateId(), text: 'Flagged Apex Financial escalation as retention-critical', time: '1 hr ago', icon: '🚨', badge: 'auto' },
    { id: generateId(), text: 'Generated Q2 OKR template from historical data', time: '1.5 hr ago', icon: '📊', badge: 'auto' },
    { id: generateId(), text: 'Prepared onboarding packet for 4 new hires', time: '2 hr ago', icon: '👥', badge: 'auto' },
  ];
}

function seedChartData() {
  return {
    weeklyTasks: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      datasets: [
        { label: 'Completed', data: [18, 24, 21, 28, 14], color: '#6366f1' },
        { label: 'Created', data: [12, 15, 19, 22, 8], color: '#06b6d4' },
      ]
    },
    emailVolume: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      data: [42, 38, 55, 47, 61, 12, 8]
    },
    taskDistribution: {
      labels: ['Engineering', 'Marketing', 'Sales', 'HR', 'Legal', 'Finance'],
      data: [35, 22, 18, 12, 8, 5],
      colors: ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
    },
    revenueByMonth: {
      labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
      data: [1120000, 1180000, 1340000, 1390000, 1420000, 1470000]
    }
  };
}

function seedBookings() {
  const today = new Date();
  function futureDate(daysAhead) {
    const d = new Date(today);
    d.setDate(today.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  }
  return [
    { id: generateId(), clientName: 'Rachel Torres', clientEmail: 'rachel@sunrisemedia.co', type: 'Consultation Call', duration: 30, date: futureDate(1), time: '10:00', status: 'confirmed', location: 'Video Call', notes: 'Discuss Q2 marketing strategy', createdAt: new Date().toISOString() },
    { id: generateId(), clientName: 'Ethan Park', clientEmail: 'epark@vanguardtech.io', type: 'Strategy Session', duration: 60, date: futureDate(2), time: '14:00', status: 'confirmed', location: 'Video Call', notes: 'Product roadmap alignment', createdAt: new Date().toISOString() },
    { id: generateId(), clientName: 'Isabella Cruz', clientEmail: 'icruz@greenleafpartners.com', type: 'Client Onboarding', duration: 45, date: futureDate(3), time: '11:00', status: 'pending', location: 'Video Call', notes: 'New enterprise onboarding', createdAt: new Date().toISOString() },
    { id: generateId(), clientName: 'James O\'Brien', clientEmail: 'jmo@bluepointcap.com', type: 'Consultation Call', duration: 30, date: futureDate(4), time: '15:30', status: 'confirmed', location: 'Video Call', notes: '', createdAt: new Date().toISOString() },
  ];
}

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        // Force re-seed if data version is outdated
        if (data._version !== DATA_VERSION) {
          console.log('J.A.R.V.I.S.: Data schema upgraded, re-seeding...');
          return this.seed();
        }
        return data;
      }
    } catch (e) { /* ignore */ }
    return this.seed();
  }

  seed(demo = true) {
    const data = demo ? this.demoData() : this.cleanData();
    this.save(data);
    return data;
  }

  demoData() {
    return {
      _version: DATA_VERSION,
      demoMode: true,
      emails: seedEmails(),
      meetings: seedMeetings(),
      tasks: seedTasks(),
      documents: seedDocuments(),
      kpis: seedKPIs(),
      activityLog: seedActivityLog(),
      chartData: seedChartData(),
      bookings: seedBookings(),
      settings: {
        autonomousMode: true,
        llmApiKey: '',
        userName: '',
        companyName: ''
      }
    };
  }

  cleanData() {
    return {
      _version: DATA_VERSION,
      demoMode: false,
      emails: [
        {
          id: generateId(), from: 'J.A.R.V.I.S.', email: 'jarvis@system',
          subject: 'Welcome — All Systems Online',
          preview: 'Good day. All systems are initialized and awaiting your command...',
          body: 'Good day, sir.\n\nAll systems are online and operating at peak efficiency. Here\'s a quick overview of what I can do for you:\n\n**📧 Communications** — I\'ll manage your inbox, draft responses, and flag what matters.\n**📅 Schedule** — Calendar management, conflict detection, and focus time protection.\n**✅ Tasks** — Priority-ranked task management with subtask breakdown.\n**📄 Documents** — File organization, search, and template generation.\n**📊 Analytics** — Productivity insights and performance tracking.\n\nYou can start by creating your first task, adding a calendar event, or simply asking me anything via the AI Assistant.\n\nAt your service,\nJ.A.R.V.I.S.',
          time: 'Just now', priority: 'low', read: false, starred: true, category: 'system',
          avatar: '⚡'
        }
      ],
      meetings: [],
      tasks: [
        { id: generateId(), title: 'Set up your J.A.R.V.I.S. workspace', status: 'in-progress', priority: 'medium', assignee: 'You', dueDate: 'Today', tags: ['onboarding'], subtasks: [
          { title: 'Configure your profile in Settings', done: false },
          { title: 'Add your first calendar event', done: false },
          { title: 'Try the AI Assistant', done: false }
        ]},
      ],
      documents: [],
      kpis: {
        tasksCompleted: { value: 0, change: 0, label: 'Tasks Done', prefix: '', format: 'number' },
        focusHours: { value: 0, change: 0, label: 'Focus Hours', prefix: '', suffix: 'h', format: 'number' },
        inboxZero: { value: 100, change: 0, label: 'Inbox Zero', prefix: '', suffix: '%', format: 'percent' },
        meetingsToday: { value: 0, change: 0, label: 'Meetings Today', prefix: '', format: 'number' },
      },
      activityLog: [
        { id: generateId(), text: 'J.A.R.V.I.S. initialized — all systems online', time: 'Just now', icon: '⚡', badge: 'system' },
        { id: generateId(), text: 'Workspace configured and ready for use', time: 'Just now', icon: '🚀', badge: 'system' },
      ],
      chartData: {
        weeklyTasks: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          datasets: [
            { label: 'Completed', data: [0, 0, 0, 0, 0], color: '#6366f1' },
            { label: 'Created', data: [0, 0, 0, 0, 0], color: '#06b6d4' },
          ]
        },
        emailVolume: {
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
          data: [0, 0, 0, 0, 0, 0, 0]
        },
        taskDistribution: {
          labels: ['Personal', 'Work', 'Learning', 'Health', 'Finance', 'Other'],
          data: [0, 0, 0, 0, 0, 0],
          colors: ['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6']
        },
        revenueByMonth: {
          labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
          data: [0, 0, 0, 0, 0, 0]
        }
      },
      bookings: [],
      settings: {
        autonomousMode: true,
        llmApiKey: '',
        userName: '',
        companyName: ''
      }
    };
  }

  enableDemoMode() {
    // Preserve settings (name, API key, etc.) but load demo data
    const currentSettings = { ...this.data.settings };
    this.data = this.demoData();
    this.data.settings = currentSettings;
    this.data.demoMode = true;
    this.save();
    return this.data;
  }

  disableDemoMode() {
    // Preserve settings but start clean
    const currentSettings = { ...this.data.settings };
    this.data = this.cleanData();
    this.data.settings = currentSettings;
    this.data.demoMode = false;
    this.save();
    return this.data;
  }

  isDemoMode() {
    return this.data.demoMode !== false;
  }

  save(data) {
    if (data) this.data = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) { /* ignore */ }
  }

  reset() {
    this.data = this.seed(this.isDemoMode());
    return this.data;
  }

  // Email methods
  getEmails() { return this.data.emails; }
  getEmail(id) { return this.data.emails.find(e => e.id === id); }
  markEmailRead(id) {
    const email = this.getEmail(id);
    if (email) { email.read = true; this.save(); }
  }
  toggleStarEmail(id) {
    const email = this.getEmail(id);
    if (email) { email.starred = !email.starred; this.save(); }
  }

  // Meeting methods
  getMeetings() { return this.data.meetings; }
  getMeetingsForDate(date) { return this.data.meetings.filter(m => m.date === date); }
  addMeeting(meeting) { this.data.meetings.push({ id: generateId(), ...meeting }); this.save(); }

  // Task methods
  getTasks() { return this.data.tasks; }
  getTasksByStatus(status) { return this.data.tasks.filter(t => t.status === status); }
  updateTaskStatus(id, status) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) { task.status = status; this.save(); }
  }
  addTask(task) { this.data.tasks.push({ id: generateId(), ...task }); this.save(); }
  updateTask(id, updates) {
    const task = this.data.tasks.find(t => t.id === id);
    if (task) { Object.assign(task, updates); this.save(); }
  }
  deleteTask(id) { this.data.tasks = this.data.tasks.filter(t => t.id !== id); this.save(); }

  // Document methods
  getDocuments() { return this.data.documents; }
  addDocument(doc) { this.data.documents.push({ id: generateId(), ...doc }); this.save(); }

  // Meeting methods (extended)
  updateMeeting(id, updates) {
    const meeting = this.data.meetings.find(m => m.id === id);
    if (meeting) { Object.assign(meeting, updates); this.save(); }
  }
  deleteMeeting(id) { this.data.meetings = this.data.meetings.filter(m => m.id !== id); this.save(); }

  // KPI & Analytics
  getKPIs() { return this.data.kpis; }
  getChartData() { return this.data.chartData; }
  getActivityLog() { return this.data.activityLog; }
  addActivity(activity) {
    this.data.activityLog.unshift({ id: generateId(), time: 'Just now', ...activity });
    if (this.data.activityLog.length > 50) this.data.activityLog.pop();
    this.save();
  }

  // Settings
  getSettings() { return this.data.settings; }
  updateSettings(updates) { Object.assign(this.data.settings, updates); this.save(); }
}

export const dataStore = new DataStore();
export default dataStore;

