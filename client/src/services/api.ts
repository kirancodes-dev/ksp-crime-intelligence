const getBaseUrl = () => {
  // If running locally (Vite dev server or local production server)
  if (
    import.meta.env.DEV || 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1'
  ) {
    return '/api';
  }
  
  // If running in Catalyst production:
  // 1. If accessed via the function URL directly (e.g. /server/functions/)
  const path = window.location.pathname;
  if (path.includes('/server/')) {
    const match = path.match(/^(\/server\/[^/]+)/);
    if (match) {
      return `${match[1]}/api`;
    }
  }
  
  // 2. If accessed via Catalyst Slate / Hosting (root url), default to the "functions" prefix
  return '/server/functions/api';
};

const BASE_URL = getBaseUrl();

export interface ChatResponse {
  success: boolean;
  originalQuery: string;
  queryParsed: string;
  language: 'en' | 'kn';
  tool: 'map' | 'chart' | 'network' | 'risk' | 'text' | 'finance' | 'socio' | 'similar' | 'forecast';
  data: any;
  narrative: string;
  evidenceSources?: EvidenceSource;
  error?: string;
  llmMode?: 'mock' | 'fallback' | 'live';
}

export interface EvidenceSource {
  tool: string;
  tablesAccessed: string[];
  confidence: string;
  queryCount?: number;
}

export interface AnomalyAlert {
  type: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  timestamp: string;
}

export interface AnomalyResponse {
  success: boolean;
  anomalies: {
    offenders: any[];
    moPatterns: any[];
    districtVolume: any[];
    generatedAlerts: AnomalyAlert[];
  };
  error?: string;
}

export interface AuditLogEntry {
  id: number;
  user_id: string;
  role: string;
  query_text: string;
  action_taken: string;
  timestamp: string;
  ip_address: string;
  data_classification?: string;
}

export interface AuditLogResponse {
  success: boolean;
  logs: AuditLogEntry[];
  error?: string;
}

export interface FinancialTrailResponse {
  success: boolean;
  nodes: Array<{ id: string; label: string; type: string; suspicious: boolean }>;
  edges: Array<{ from: string; to: string; label: string; color: { color: string } }>;
  totalAmount: number;
  suspiciousCount: number;
  summary: string;
  error?: string;
}

export interface SimilarCasesResponse {
  success: boolean;
  targetCase: {
    fir_number: string;
    crime_type: string;
    district: string;
    modus_operandi: string;
  };
  similarCases: Array<{
    fir_number: string;
    crime_type: string;
    district: string;
    similarity_score: number;
    status: string;
    shared_attributes: string[];
  }>;
  investigativeLeads: string[];
  error?: string;
}

export interface CrimeForecast {
  district: string;
  predicted_crime_type: string;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low';
  confidence: number;
  reasoning: string;
  recommended_action: string;
  data_sources: string;
  forecast_date: string;
  valid_until: string;
}

export interface ForecastResponse {
  success: boolean;
  forecasts: CrimeForecast[];
  error?: string;
}

export interface SocioDemographicResponse {
  success: boolean;
  demographics: {
    ageGroups: Array<{ age_group: string; count: number }>;
    genderSplit: Array<{ gender: string; count: number }>;
    educationLevels: Array<{ education_level: string; count: number }>;
    migrationStatus: Array<{ status: string; count: number }>;
  };
  socioCorrelation: Array<{
    district: string;
    crime_count: number;
    unemployment_rate: number;
    literacy_rate: number;
    poverty_index: number;
  }>;
}

export interface SmartBrowzLog {
  id: number;
  timestamp: string;
  category: string;
  feature: string;
  status: 'SUCCESS' | 'FAILED';
  latency_ms: number;
  size_kb: number | null;
  details: string;
}

export interface SmartBrowzFeatureBreakdown {
  category: string;
  feature: string;
  count: number;
  successRate: number;
}

export interface SmartBrowzTrendPoint {
  time: string;
  requests: number;
  success: number;
  failed: number;
}

export interface SmartBrowzStatsResponse {
  success: boolean;
  stats: {
    total: number;
    successRate: number;
    avgLatency: number;
    totalSize: number;
    features: SmartBrowzFeatureBreakdown[];
    chartData: SmartBrowzTrendPoint[];
    recentLogs: SmartBrowzLog[];
  };
  error?: string;
}

export interface SmartBrowzRunResponse {
  success: boolean;
  action: {
    category: string;
    feature: string;
    status: 'SUCCESS' | 'FAILED';
    latency: number;
    sizeKb: number | null;
    details: string;
    timestamp: string;
  };
  logOutput: string[];
  error?: string;
}

/**
 * Custom fetch wrapper that automatically appends JWT tokens and handles token refresh.
 */
async function secureFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('ksp_jwt_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const updatedOptions = { ...options, headers };
  let response = await fetch(url, updatedOptions);

  // If unauthorized and we have a token, attempt to refresh token
  if (response.status === 401 && token) {
    try {
      const refreshResponse = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        if (data.success && data.token) {
          localStorage.setItem('ksp_jwt_token', data.token);
          // Retry original request with refreshed token
          headers['Authorization'] = `Bearer ${data.token}`;
          response = await fetch(url, updatedOptions);
        }
      } else {
        // Refresh token failed - logout user
        localStorage.removeItem('ksp_jwt_token');
        localStorage.removeItem('ksp_user_id');
        localStorage.removeItem('ksp_user_role');
        localStorage.removeItem('ksp_mfa_verified');
        window.location.reload();
      }
    } catch (err) {
      console.error('MFA Token Refresh Handshake Failed:', err);
    }
  }

  return response;
}

export const api = {
  /**
   * Performs real badge login
   */
  async login(badgeId: string, password: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ badgeId, password }),
    });
    
        if (!response.ok) {
      let errorMsg = '';
      try {
        const err = await response.json();
        errorMsg = err.error || err.message || JSON.stringify(err);
      } catch (e) {
        try {
          const text = await response.text();
          errorMsg = text.substring(0, 150) || `HTTP Error ${response.status}: ${response.statusText}`;
        } catch (textErr) {
          errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
        }
      }
      throw new Error(errorMsg || 'Authentication failed. Check your Badge ID and password.');
    }
    return response.json();
  },

  /**
   * Submits a natural language query to the conversation orchestrator
   */
  async submitChat(query: string, _userId: string, _role: string, sessionId?: string): Promise<ChatResponse> {
    const response = await secureFetch(`${BASE_URL}/chat`, {
      method: 'POST',
      body: JSON.stringify({ query, sessionId }),
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to communicate with chat service');
    }
    return response.json();
  },

  /**
   * Fetches real-time anomaly alerts from Zia AutoML engine
   */
  async getAnomalies(_userId: string, _role: string): Promise<AnomalyResponse> {
    const response = await secureFetch(`${BASE_URL}/anomalies`);
    if (!response.ok) {
      throw new Error('Failed to fetch system anomalies');
    }
    return response.json();
  },

  /**
   * Fetches audit log entries for Supervisor inspection
   */
  async getAuditLogs(_userId: string, _role: string): Promise<AuditLogResponse> {
    const response = await secureFetch(`${BASE_URL}/audit-logs`);
    if (!response.ok) {
      throw new Error('Failed to fetch system audit logs');
    }
    return response.json();
  },

  /**
   * Submits an override justification for critical audit compliance events
   */
  async submitOverride(alertTitle: string, reason: string, justification: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/audit-logs/override`, {
      method: 'POST',
      body: JSON.stringify({ alertTitle, reason, justification }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to submit override justification');
    }
    return response.json();
  },

  /**
   * Fetches detailed case file details
   */
  async getCaseDetails(firNumber: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/fir/${firNumber}`);
    if (!response.ok) {
      throw new Error('Failed to fetch case file');
    }
    return response.json();
  },

  /**
   * Fetches financial transaction trail for a specific FIR
   */
  async getFinancialTrail(firId: number, _userId: string, _role: string): Promise<FinancialTrailResponse> {
    const response = await secureFetch(`${BASE_URL}/financial/${firId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch financial trail');
    }
    return response.json();
  },

  /**
   * Fetches similar past cases for a given FIR
   */
  async getSimilarCases(firId: number, _userId: string, _role: string): Promise<SimilarCasesResponse> {
    const response = await secureFetch(`${BASE_URL}/similar/${firId}`);
    if (!response.ok) {
      throw new Error('Failed to find similar cases');
    }
    return response.json();
  },

  /**
   * Fetches crime forecasts / early warning predictions
   */
  async getForecasts(_userId: string, _role: string): Promise<ForecastResponse> {
    const response = await secureFetch(`${BASE_URL}/forecasts`);
    if (!response.ok) {
      throw new Error('Failed to fetch crime forecasts');
    }
    return response.json();
  },

  /**
   * Fetches socio-demographic crime insights
   */
  async getSocioDemographics(_userId: string, _role: string): Promise<SocioDemographicResponse> {
    const response = await secureFetch(`${BASE_URL}/socio-demographics`);
    if (!response.ok) {
      throw new Error('Failed to fetch socio-demographic data');
    }
    return response.json();
  },

  /**
   * Fetches real counts of database incidents for KPI statistics
   */
  async getDashboardStats(district: string, crimeType: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/dashboard/stats?district=${encodeURIComponent(district)}&crimeType=${encodeURIComponent(crimeType)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard statistics');
    }
    return response.json();
  },

  /**
   * Generates and downloads a conversation PDF summary using SmartBrowz
   */
  async exportPdfReport(htmlContent: string, _userId: string, _role: string): Promise<Blob> {
    const response = await secureFetch(`${BASE_URL}/pdf-export`, {
      method: 'POST',
      body: JSON.stringify({ htmlContent }),
    });

    if (!response.ok) {
      throw new Error('PDF compilation failed');
    }
    return response.blob();
  },

  /**
   * Generates TTS audio data (base64) using Zia textToSpeech
   */
  async textToSpeech(text: string, _userId: string, _role: string): Promise<string> {
    const response = await secureFetch(`${BASE_URL}/voice`, {
      method: 'POST',
      body: JSON.stringify({ action: 'tts', text }),
    });
    if (!response.ok) {
      throw new Error('Text to speech service failed');
    }
    const result = await response.json();
    return result.audioContent;
  },

  /**
   * Uploads and runs simulated OCR + translation on a vernacular file
   */
  async analyzeOcr(fileName: string, fileType: string, base64Data: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/ocr/analyze`, {
      method: 'POST',
      body: JSON.stringify({ fileName, fileType, base64Data }),
    });
    if (!response.ok) {
      throw new Error('OCR analysis failed');
    }
    return response.json();
  },

  /**
   * Fetches simulated CDR timeline trajectory logs for a suspect
   */
  async getCdrTimeline(suspect: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/cdr/timeline?suspect=${encodeURIComponent(suspect)}`);
    if (!response.ok) {
      throw new Error('Failed to fetch CDR timeline');
    }
    return response.json();
  },

  /**
   * Searches suspect databases using facial recognition similarity checks
   */
  async searchBiometrics(name: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/biometrics/search`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      throw new Error('Biometric search failed');
    }
    return response.json();
  },

  /**
   * Fetches active emergency dispatch patrol vehicles list
   */
  async getDispatchUnits(_userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/dispatch/units`);
    if (!response.ok) {
      throw new Error('Failed to fetch dispatch patrol vehicles');
    }
    return response.json();
  },

  /**
   * Fetches collaborative workspace state (pinned assets and notes)
   */
  async getWorkspaceState(_userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/workspace`);
    if (!response.ok) {
      throw new Error('Failed to fetch workspace state');
    }
    return response.json();
  },

  /**
   * Pins or unpins a case asset to/from the collaborative workspace
   */
  async pinWorkspaceAsset(assetType: 'fir' | 'accused', assetId: string, details: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/workspace/pin`, {
      method: 'POST',
      body: JSON.stringify({ assetType, assetId, details }),
    });
    if (!response.ok) {
      throw new Error('Failed to pin/unpin workspace asset');
    }
    return response.json();
  },

  /**
   * Updates the shared notes on the collaborative workspace
   */
  async saveWorkspaceNotes(notes: string, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/workspace/notes`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) {
      throw new Error('Failed to update workspace notes');
    }
    return response.json();
  },

  /**
   * Fetches CCTNS sync execution job history runs
   */
  async getCctnsRuns(_userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/cctns/runs`);
    if (!response.ok) {
      throw new Error('Failed to fetch CCTNS sync history');
    }
    return response.json();
  },

  /**
   * Triggers a CCTNS synchronization execution run
   */
  async triggerCctnsSync(triggerType: 'Manual' | 'Automatic', _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/cctns/sync`, {
      method: 'POST',
      body: JSON.stringify({ triggerType }),
    });
    if (!response.ok) {
      throw new Error('Failed to trigger CCTNS sync job');
    }
    return response.json();
  },

  /**
   * Fetches all FIR cases with metadata for the Warrant Desk
   */
  async getWarrants(_userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/warrants`);
    if (!response.ok) {
      throw new Error('Failed to fetch warrant data');
    }
    return response.json();
  },

  /**
   * Bulk-updates the status and assignment of multiple FIR cases
   */
  async bulkUpdateWarrants(
    firIds: number[],
    newStatus: string,
    assignedOfficer: string,
    urgencyNote: string,
    _userId: string,
    _role: string
  ): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/warrants/bulk`, {
      method: 'PATCH',
      body: JSON.stringify({ firIds, newStatus, assignedOfficer, urgencyNote }),
    });
    if (!response.ok) {
      throw new Error('Failed to bulk-update warrants');
    }
    return response.json();
  },

  async getInvestigationTimeline(firId: number, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/timeline/${firId}`);
    if (!response.ok) throw new Error('Failed to fetch investigation timeline');
    return response.json();
  },

  async getEarlyWarning(_userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/early-warning`);
    if (!response.ok) throw new Error('Failed to fetch early warning intelligence');
    return response.json();
  },

  async getCaseSummary(firId: number, _userId: string, _role: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/case-summary/${firId}`);
    if (!response.ok) throw new Error('Failed to fetch case summary');
    return response.json();
  },

  /**
   * Fetches aggregated SmartBrowz usage stats, breakdowns, and trend history.
   */
  async getSmartBrowzStats(timeFilter: string, _userId: string, _role: string): Promise<SmartBrowzStatsResponse> {
    const response = await secureFetch(`${BASE_URL}/smartbrowz/stats?timeFilter=${timeFilter}`);
    if (!response.ok) {
      throw new Error('Failed to fetch SmartBrowz statistics');
    }
    return response.json();
  },

  /**
   * Triggers a simulated SmartBrowz browser control or convert task.
   */
  async triggerSmartBrowzAction(actionType: string, _userId: string, _role: string): Promise<SmartBrowzRunResponse> {
    const response = await secureFetch(`${BASE_URL}/smartbrowz/run`, {
      method: 'POST',
      body: JSON.stringify({ actionType }),
    });
    if (!response.ok) {
      throw new Error('Failed to run SmartBrowz test action');
    }
    return response.json();
  },

  // --- NEW INTEGRATED LEGAL & COMPLIANCE SERVICES ---

  async getCourtStatus(firNumber: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/court/${firNumber}`);
    if (!response.ok) {
      throw new Error('Failed to fetch e-Courts case status');
    }
    return response.json();
  },

  async getPrisonStatus(accusedId: number): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/prison/${accusedId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch e-Prisons inmate status');
    }
    return response.json();
  },

  async getReleaseAlerts(): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/prison/releases`);
    if (!response.ok) {
      throw new Error('Failed to fetch release alerts');
    }
    return response.json();
  },

  async registerEvidence(firId: number, type: string, fileHash: string, fileName?: string, description?: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/evidence/register`, {
      method: 'POST',
      body: JSON.stringify({ firId, type, fileHash, fileName, description }),
    });
    if (!response.ok) {
      throw new Error('Failed to register evidence');
    }
    return response.json();
  },

  async getEvidenceChain(firId: number): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/evidence/${firId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch evidence chain');
    }
    return response.json();
  },

  async verifyEvidence(evidenceId: number, fileHash: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/evidence/verify`, {
      method: 'POST',
      body: JSON.stringify({ evidenceId, fileHash }),
    });
    if (!response.ok) {
      throw new Error('Failed to verify evidence hash');
    }
    return response.json();
  },

  async getBnsMapping(): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/bns/mapping`);
    if (!response.ok) {
      throw new Error('Failed to fetch BNS mapping registry');
    }
    return response.json();
  },

  async translateBns(ipcSection: string): Promise<any> {
    const response = await secureFetch(`${BASE_URL}/bns/translate/${ipcSection}`);
    if (!response.ok) {
      throw new Error('Failed to translate IPC section to BNS');
    }
    return response.json();
  }
};
