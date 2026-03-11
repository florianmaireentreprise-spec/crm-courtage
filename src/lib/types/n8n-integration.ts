// Types for n8n integration API routes

export interface ClientByEmailResponse {
  client_id: string;
  name: string;
  company: string;
  status: string;
}

export interface ClientContextResponse {
  recent_emails: {
    id: string;
    subject: string;
    from: string;
    date: string;
    direction: string;
  }[];
  open_tasks: {
    id: string;
    title: string;
    priority: string;
    status: string;
    due_date: string | null;
  }[];
  notes: string | null;
}

export interface CreateEmailBody {
  client_id: string;
  subject: string;
  body: string;
  thread_id?: string;
  source?: string;
}

export interface CreateEmailAnalysisBody {
  email_id: string;
  action: string;
  priority?: string;
  summary?: string;
  reply_suggestion?: string;
}

export interface CreateTaskBody {
  client_id: string;
  title: string;
  priority?: string;
}
