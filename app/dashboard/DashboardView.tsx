'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import styles from './dashboard.module.css';
import {
  LayoutDashboard,
  Wallet,
  Calendar,
  CheckSquare,
  LogOut,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  ChevronRight,
  MessageCircle,
  X
} from 'lucide-react';

interface FinanceItem {
  id: string;
  type: 'Expense' | 'Gross Income';
  amount: number;
  category: string;
  description: string;
  created_at: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'Low' | 'Medium' | 'High';
  due_date: string | null;
  created_at: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  created_at: string;
}

export default function DashboardView() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'finances' | 'schedule' | 'checklist'>('overview');

  // Data States
  const [finances, setFinances] = useState<FinanceItem[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [finType, setFinType] = useState<'Expense' | 'Gross Income'>('Expense');
  const [finAmount, setFinAmount] = useState('');
  const [finCategory, setFinCategory] = useState('');
  const [finDescription, setFinDescription] = useState('');

  const [todoTitle, setTodoTitle] = useState('');
  const [todoPriority, setTodoPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [todoDue, setTodoDue] = useState('');

  const [schedTitle, setSchedTitle] = useState('');
  const [schedDesc, setSchedDesc] = useState('');
  const [schedStart, setSchedStart] = useState('');
  const [schedEnd, setSchedEnd] = useState('');

  // Command Bar State
  const [commandText, setCommandText] = useState('');
  const [commandFeedback, setCommandFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isCommandLoading, setIsCommandLoading] = useState(false);

  // Fetch logic
  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: finData } = await supabase
        .from('finances')
        .select('*')
        .order('created_at', { ascending: false });
      setFinances((finData as unknown as FinanceItem[]) || []);

      const { data: checkData } = await supabase
        .from('checklist')
        .select('*')
        .order('created_at', { ascending: false });
      setChecklist((checkData as unknown as ChecklistItem[]) || []);

      const { data: schedData } = await supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: true });
      setSchedules((schedData as unknown as ScheduleItem[]) || []);
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Subscriptions & Initial Load
  useEffect(() => {
    if (!user) return;
    fetchAllData();

    // Subscribe to real-time events on Supabase
    const financesChannel = supabase
      .channel('realtime:finances')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finances' }, () => {
        supabase.from('finances').select('*').order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setFinances(data as unknown as FinanceItem[]); });
      })
      .subscribe();

    const checklistChannel = supabase
      .channel('realtime:checklist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'checklist' }, () => {
        supabase.from('checklist').select('*').order('created_at', { ascending: false })
          .then(({ data }) => { if (data) setChecklist(data as unknown as ChecklistItem[]); });
      })
      .subscribe();

    const schedulesChannel = supabase
      .channel('realtime:schedules')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, () => {
        supabase.from('schedules').select('*').order('start_time', { ascending: true })
          .then(({ data }) => { if (data) setSchedules(data as unknown as ScheduleItem[]); });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(financesChannel);
      supabase.removeChannel(checklistChannel);
      supabase.removeChannel(schedulesChannel);
    };
  }, [user, fetchAllData]);

  // Form submit handlers
  const handleAddFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !finAmount || !finCategory) return;
    try {
      const { error } = await supabase.from('finances').insert({
        user_id: user.id,
        type: finType,
        amount: parseFloat(finAmount),
        category: finCategory,
        description: finDescription,
      });

      if (!error) {
        setFinAmount('');
        setFinCategory('');
        setFinDescription('');
      } else {
        alert(error.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !todoTitle) return;
    try {
      const { error } = await supabase.from('checklist').insert({
        user_id: user.id,
        title: todoTitle,
        priority: todoPriority,
        due_date: todoDue ? new Date(todoDue).toISOString() : null,
        status: 'Pending',
      });

      if (!error) {
        setTodoTitle('');
        setTodoPriority('Medium');
        setTodoDue('');
      } else {
        alert(error.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !schedTitle || !schedStart || !schedEnd) return;
    try {
      const { error } = await supabase.from('schedules').insert({
        user_id: user.id,
        title: schedTitle,
        description: schedDesc,
        start_time: new Date(schedStart).toISOString(),
        end_time: new Date(schedEnd).toISOString(),
      });

      if (!error) {
        setSchedTitle('');
        setSchedDesc('');
        setSchedStart('');
        setSchedEnd('');
      } else {
        alert(error.message);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  // Toggle checklist task status
  const handleToggleTask = async (task: ChecklistItem) => {
    if (!user) return;
    const nextStatusMap: Record<string, 'Pending' | 'In Progress' | 'Completed'> = {
      'Pending': 'In Progress',
      'In Progress': 'Completed',
      'Completed': 'Pending'
    };
    const newStatus = nextStatusMap[task.status] || 'Pending';
    try {
      await supabase
        .from('checklist')
        .update({ status: newStatus })
        .eq('id', task.id);
    } catch (e) {
      console.error('Error toggling task:', e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await supabase.from('checklist').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFinance = async (id: string) => {
    try {
      await supabase.from('finances').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await supabase.from('schedules').delete().eq('id', id);
    } catch (e) {
      console.error(e);
    }
  };

  // Webhook-based Command Bar Parser
  const executeCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandText.trim() || !user || isCommandLoading) return;
    setCommandFeedback(null);
    setIsCommandLoading(true);
    const text = commandText.trim();

    try {
      // 1. Get the current Supabase session token to pass to n8n (so it can authenticate API calls)
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Call your n8n webhook
      // NOTE: Replace this URL with your actual n8n production webhook URL
      const response = await fetch('https://jasmine-apache-cyclist.ngrok-free.dev/webhook/web-chat-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` // Passed to n8n to use in Supabase Tools
        },
        body: JSON.stringify({
          message: {
            text: text,
            chat: {
              id: user.id // Send Supabase user ID as chat ID
            },
            session_id: crypto.randomUUID() // Unique ID per command to isolate memory
          }
        })
      });

      if (!response.ok) {
        throw new Error('Network response from AI agent was not ok.');
      }

      // 3. Parse the response from the n8n webhook
      const result = await response.json();

      // The exact field name depends on how you configure your 'Respond to Webhook' node in n8n.
      const aiResponseText = result.output || result.text || result.message || 'Command executed successfully!';

      showFeedback(aiResponseText, 'success');
      setCommandText('');

      // Refresh the dashboard data to show the new changes
      fetchAllData();

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      showFeedback(`Failed: ${errorMessage}`, 'error');
    } finally {
      setIsCommandLoading(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'error') => {
    setCommandFeedback({ text, type });
    setTimeout(() => {
      setCommandFeedback(null);
    }, 4000);
  };

  const handlePillClick = (prefill: string) => {
    setCommandText(prefill);
    const inputEl = document.getElementById('nl-command-input');
    if (inputEl) {
      inputEl.focus();
    }
  };

  // Financial aggregates
  const totalIncome = finances
    .filter((f) => f.type === 'Gross Income')
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExpense = finances
    .filter((f) => f.type === 'Expense')
    .reduce((sum, f) => sum + Number(f.amount), 0);
  const balance = totalIncome - totalExpense;

  // Percentage calculations
  const totalTurnover = totalIncome + totalExpense;
  const incomePercent = totalTurnover > 0 ? (totalIncome / totalTurnover) * 100 : 50;

  // Format Helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getLocalDateString = () => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className={styles.layout}>
      {/* 1. LEFT NAVIGATION RAIL */}
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <div style={{ width: 42, height: 42, cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="arlo-logo-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EC4D25" />
                  <stop offset="100%" stopColor="#E0421D" />
                </linearGradient>
              </defs>
              <path d="M 50 10 L 10 90 L 90 90 Z" fill="url(#arlo-logo-gradient)" />
              <circle cx="50" cy="75" r="15" fill="#0f172a" />
            </svg>
          </div>
          <span className={styles.logoText}>ARLO</span>
        </div>

        <nav className={styles.navGroup}>
          <button
            title="Overview"
            className={`${styles.navItem} ${activeTab === 'overview' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={20} />
          </button>
          <button
            title="Finances"
            className={`${styles.navItem} ${activeTab === 'finances' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('finances')}
          >
            <Wallet size={20} />
          </button>
          <button
            title="Schedule"
            className={`${styles.navItem} ${activeTab === 'schedule' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            <Calendar size={20} />
          </button>
          <button
            title="Checklist"
            className={`${styles.navItem} ${activeTab === 'checklist' ? styles.navItemActive : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            <CheckSquare size={20} />
          </button>
        </nav>

        <button
          title="Sign Out"
          className={styles.signOutBtn}
          onClick={signOut}
        >
          <LogOut size={20} />
        </button>
      </aside>

      {/* 2. MAIN APPLICATION WORKSPACE */}
      <main className={styles.main}>
        {/* Welcome Section */}
        <section className={styles.header}>
          <div>
            <h1 className={styles.welcomeTitle}>Welcome back, Bert</h1>
            <p className={styles.dateSubtitle}>{getLocalDateString()}</p>
          </div>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-muted)' }}>
              <RefreshCw size={14} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
              Syncing database...
            </div>
          )}
        </section>

        {/* Dynamic Views */}
        {activeTab === 'overview' && (
          <div className={styles.bentoGrid}>
            {/* Net Balance Card */}
            <div className={`${styles.card} ${styles.col8}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Wallet size={18} /> Balance Overview</h2>
                <span className={styles.dateSubtitle}>Realtime updates</span>
              </div>
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Net Balance</span>
                  <span className={`${styles.statVal} ${balance >= 0 ? styles.incomeText : styles.expenseText}`}>
                    {formatCurrency(balance)}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Gross Income</span>
                  <span className={`${styles.statVal} ${styles.incomeText}`}>{formatCurrency(totalIncome)}</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Total Expenses</span>
                  <span className={`${styles.statVal} ${styles.expenseText}`}>{formatCurrency(totalExpense)}</span>
                </div>
              </div>

              <div className={styles.progressWrapper}>
                <div className={styles.progressLabelRow}>
                  <span style={{ color: '#10b981' }}>Income ({incomePercent.toFixed(0)}%)</span>
                  <span style={{ color: '#f43f5e' }}>Expense ({(100 - incomePercent).toFixed(0)}%)</span>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={`${styles.progressBarFill} ${styles.progressSuccess}`}
                    style={{ width: `${incomePercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats Checklist summary */}
            <div className={`${styles.card} ${styles.col4}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><CheckSquare size={18} /> Tasks Status</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={styles.listItem}>
                  <span className={styles.listTitle}>Pending</span>
                  <span className={`${styles.badge} ${styles.badgeMedium}`}>
                    {checklist.filter(t => t.status === 'Pending').length}
                  </span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listTitle}>In Progress</span>
                  <span className={`${styles.badge} ${styles.badgeLow}`}>
                    {checklist.filter(t => t.status === 'In Progress').length}
                  </span>
                </div>
                <div className={styles.listItem}>
                  <span className={styles.listTitle}>Completed</span>
                  <span className={`${styles.badge} ${styles.badgeCompleted}`}>
                    {checklist.filter(t => t.status === 'Completed').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule Upcoming events */}
            <div className={`${styles.card} ${styles.col6}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Calendar size={18} /> Upcoming Schedule</h2>
                <button className={styles.pill} onClick={() => setActiveTab('schedule')}>View Calendar</button>
              </div>
              {schedules.slice(0, 3).length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No events scheduled</p>
                </div>
              ) : (
                schedules.slice(0, 3).map((event) => (
                  <div key={event.id} className={styles.listItem}>
                    <div className={styles.listInfo}>
                      <span className={styles.listTitle}>{event.title}</span>
                      <span className={styles.listSubtitle}>{event.description}</span>
                    </div>
                    <div className={styles.listMeta}>
                      <span className={styles.listTitle} style={{ fontSize: 13 }}>{formatDate(event.start_time)}</span>
                      <span className={styles.listSubtitle}>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tasks Summary */}
            <div className={`${styles.card} ${styles.col6}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><CheckSquare size={18} /> Top Checklist Tasks</h2>
                <button className={styles.pill} onClick={() => setActiveTab('checklist')}>View All</button>
              </div>
              {checklist.filter(t => t.status !== 'Completed').slice(0, 3).length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>All clear! No pending tasks.</p>
                </div>
              ) : (
                checklist.filter(t => t.status !== 'Completed').slice(0, 3).map((task) => (
                  <div key={task.id} className={styles.listItem}>
                    <div className={styles.checkboxContainer} onClick={() => handleToggleTask(task)}>
                      <div className={`${styles.checkbox} ${task.status === 'In Progress' ? styles.checkboxChecked : ''}`}>
                        {task.status === 'In Progress' && <ChevronRight size={12} />}
                      </div>
                      <span className={styles.listTitle}>{task.title}</span>
                    </div>
                    <div>
                      <span className={`${styles.badge} ${task.priority === 'High' ? styles.badgeHigh :
                        task.priority === 'Medium' ? styles.badgeMedium : styles.badgeLow
                        }`}>{task.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'finances' && (
          <div className={styles.bentoGrid}>
            {/* Input Form */}
            <div className={`${styles.card} ${styles.col4}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Plus size={18} /> Log Transaction</h2>
              </div>
              <form onSubmit={handleAddFinance} className={styles.formInline}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Type</label>
                  <select
                    className={styles.select}
                    value={finType}
                    onChange={(e) => setFinType(e.target.value as 'Expense' | 'Gross Income')}
                  >
                    <option value="Expense">Expense</option>
                    <option value="Gross Income">Gross Income</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Amount (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className={styles.input}
                    value={finAmount}
                    onChange={(e) => setFinAmount(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Food, Software, Business"
                    className={styles.input}
                    value={finCategory}
                    onChange={(e) => setFinCategory(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS Monthly Bill"
                    className={styles.input}
                    value={finDescription}
                    onChange={(e) => setFinDescription(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.formBtn}>Log Record</button>
              </form>
            </div>

            {/* Financial Ledger Log */}
            <div className={`${styles.card} ${styles.col8}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Wallet size={18} /> Financial Ledger</h2>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Total Balance: <strong className={balance >= 0 ? styles.incomeText : styles.expenseText}>{formatCurrency(balance)}</strong>
                </div>
              </div>

              {finances.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No financial logs saved. Use the sidebar form or text assistant.</p>
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>Date</th>
                        <th className={styles.th}>Category</th>
                        <th className={styles.th}>Description</th>
                        <th className={styles.th} style={{ textAlign: 'right' }}>Amount</th>
                        <th className={styles.th} style={{ textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {finances.map((item) => (
                        <tr key={item.id} className={styles.tr}>
                          <td className={styles.td}>{formatDate(item.created_at)}</td>
                          <td className={styles.td}>
                            <span className={`${styles.badge} ${item.type === 'Gross Income' ? styles.badgeCompleted : styles.badgeHigh}`} style={{ textTransform: 'none' }}>
                              {item.category}
                            </span>
                          </td>
                          <td className={styles.td}>{item.description || '—'}</td>
                          <td className={styles.td} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            <span className={item.type === 'Gross Income' ? styles.incomeText : styles.expenseText}>
                              {item.type === 'Gross Income' ? '+' : '-'}{formatCurrency(item.amount)}
                            </span>
                          </td>
                          <td className={styles.td} style={{ textAlign: 'center' }}>
                            <button
                              title="Delete Transaction"
                              onClick={() => handleDeleteFinance(item.id)}
                              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className={styles.bentoGrid}>
            {/* Input Form */}
            <div className={`${styles.card} ${styles.col4}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Plus size={18} /> Schedule Event</h2>
              </div>
              <form onSubmit={handleAddSchedule} className={styles.formInline}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Event Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Weekly Standup"
                    className={styles.input}
                    value={schedTitle}
                    onChange={(e) => setSchedTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Sync engineering deliverables"
                    className={styles.input}
                    value={schedDesc}
                    onChange={(e) => setSchedDesc(e.target.value)}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Start Time</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={schedStart}
                    onChange={(e) => setSchedStart(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>End Time</label>
                  <input
                    type="datetime-local"
                    className={styles.input}
                    value={schedEnd}
                    onChange={(e) => setSchedEnd(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className={styles.formBtn}>Time Block</button>
              </form>
            </div>

            {/* Schedule Events Timeline */}
            <div className={`${styles.card} ${styles.col8}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Calendar size={18} /> Schedule & Time Blocks</h2>
              </div>

              {schedules.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>Your schedule is empty. Add a time-block via the form or text command.</p>
                </div>
              ) : (
                schedules.map((event) => (
                  <div key={event.id} className={styles.listItem} style={{ gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 64, borderRight: '1px solid rgba(0,0,0,0.05)', paddingRight: 16 }}>
                      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>
                        {new Date(event.start_time).getDate()}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light)' }}>
                        {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                    </div>

                    <div style={{ flex: 1 }} className={styles.listInfo}>
                      <span className={styles.listTitle} style={{ fontSize: 16 }}>{event.title}</span>
                      <span className={styles.listSubtitle}>{event.description}</span>
                    </div>

                    <div className={styles.listMeta} style={{ minWidth: 'auto', flexWrap: 'wrap' }}>
                      <span className={styles.listTitle} style={{ fontSize: 13, color: '#EC4D25' }}>
                        {formatTime(event.start_time)} - {formatTime(event.end_time)}
                      </span>
                      <button
                        title="Delete Event"
                        onClick={() => handleDeleteSchedule(event.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)', marginTop: 8 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'checklist' && (
          <div className={styles.bentoGrid}>
            {/* Input Form */}
            <div className={`${styles.card} ${styles.col4}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><Plus size={18} /> Add Task</h2>
              </div>
              <form onSubmit={handleAddTodo} className={styles.formInline}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Task Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Set up Supabase RLS index"
                    className={styles.input}
                    value={todoTitle}
                    onChange={(e) => setTodoTitle(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Priority</label>
                  <select
                    className={styles.select}
                    value={todoPriority}
                    onChange={(e) => setTodoPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                  >
                    <option value="Low">Low Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="High">High Priority</option>
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Due Date (Optional)</label>
                  <input
                    type="date"
                    className={styles.input}
                    value={todoDue}
                    onChange={(e) => setTodoDue(e.target.value)}
                  />
                </div>

                <button type="submit" className={styles.formBtn}>Create Task</button>
              </form>
            </div>

            {/* Checklist items list */}
            <div className={`${styles.card} ${styles.col8}`}>
              <div className={styles.cardHeader}>
                <h2 className={styles.cardTitle}><CheckSquare size={18} /> Action Checklist</h2>
              </div>

              {checklist.length === 0 ? (
                <div className={styles.emptyState}>
                  <p className={styles.emptyText}>No checklist tasks saved. Create tasks to track details.</p>
                </div>
              ) : (
                checklist.map((task) => (
                  <div key={task.id} className={styles.listItem}>
                    <div className={styles.checkboxContainer} onClick={() => handleToggleTask(task)}>
                      <div className={`${styles.checkbox} ${task.status === 'Completed' ? styles.checkboxChecked : ''}`}>
                        {task.status === 'Completed' && <Check size={12} />}
                        {task.status === 'In Progress' && <ChevronRight size={12} style={{ color: '#2563eb' }} />}
                      </div>
                      <span className={`${styles.listTitle} ${task.status === 'Completed' ? styles.completedTaskTitle : ''}`}>
                        {task.title}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className={`${styles.badge} ${task.status === 'Completed' ? styles.badgeCompleted :
                        task.status === 'In Progress' ? styles.badgeInProgress : styles.badgePending
                        }`}>
                        {task.status === 'In Progress' ? 'In Progress' : task.status}
                      </span>

                      <span className={`${styles.badge} ${task.priority === 'High' ? styles.badgeHigh :
                        task.priority === 'Medium' ? styles.badgeMedium : styles.badgeLow
                        }`}>
                        {task.priority}
                      </span>

                      {task.due_date && (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          Due: {formatDate(task.due_date)}
                        </span>
                      )}

                      <button
                        title="Delete Task"
                        onClick={() => handleDeleteTask(task.id)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-light)', padding: 4 }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#f43f5e'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-light)'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* 3. FLOATING CHATBOT WIDGET */}
      <div className={`${styles.commandContainer} ${isChatOpen ? styles.chatOpen : ''}`}>
        {commandFeedback && (
          <div className={commandFeedback.type === 'success' ? styles.successBox : styles.errorBox} style={{ width: '100%', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.05)' }}>
            {commandFeedback.text}
          </div>
        )}

        <div className={styles.commandPills}>
          <button className={styles.pill} onClick={() => handlePillClick('spent ₱200 on coffee')}>spent ₱200 on coffee</button>
          <button className={styles.pill} onClick={() => handlePillClick('received ₱15000 for milestone')}>received ₱15000 for milestone</button>
          <button className={styles.pill} onClick={() => handlePillClick('todo fix database index')}>todo fix database index</button>
          <button className={styles.pill} onClick={() => handlePillClick('schedule client meeting')}>schedule client meeting</button>
        </div>

        <form onSubmit={executeCommand} className={styles.commandBar}>
          <input
            id="nl-command-input"
            type="text"
            className={styles.commandInput}
            placeholder={isCommandLoading ? "Bot is thinking..." : "Message ARLO..."}
            value={commandText}
            onChange={(e) => setCommandText(e.target.value)}
            disabled={isCommandLoading}
          />
          <button type="submit" className={styles.commandSendBtn} disabled={isCommandLoading}>
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* FAB BUTTON */}
      <button 
        className={styles.chatFab} 
        onClick={() => setIsChatOpen(!isChatOpen)}
        title="Toggle Chat"
      >
        {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}
