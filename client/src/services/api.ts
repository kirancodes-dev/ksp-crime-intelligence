const BASE_URL = 'http://localhost:3001/api';

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
    ageGroups: Array<{ range: string; count: number }>;
    genderSplit: Array<{ gender: string; count: number }>;
    educationLevels: Array<{ level: string; count: number }>;
    migrationStatus: Array<{ status: string; count: number }>;
  };
  socioCorrelation: Array<{
    district: string;
    crimeRate: number;
    unemploymentRate: number;
    literacyRate: number;
    povertyIndex: number;
  }>;
  error?: string;
}

export const api = {
  /**
   * Submits a natural language query to the conversation orchestrator
   */
  async submitChat(query: string, userId: string, role: string, sessionId?: string): Promise<ChatResponse> {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async getAnomalies(userId: string, role: string): Promise<AnomalyResponse> {
    const response = await fetch(`${BASE_URL}/anomalies`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch system anomalies');
    }
    return response.json();
  },

  /**
   * Fetches audit log entries for Supervisor inspection
   */
  async getAuditLogs(userId: string, role: string): Promise<AuditLogResponse> {
    const response = await fetch(`${BASE_URL}/audit-logs`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch system audit logs');
    }
    return response.json();
  },

  /**
   * Fetches detailed case file details
   */
  async getCaseDetails(firNumber: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/fir/${firNumber}`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch case file');
    }
    return response.json();
  },

  /**
   * Fetches financial transaction trail for a specific FIR
   */
  async getFinancialTrail(firId: number, userId: string, role: string): Promise<FinancialTrailResponse> {
    const response = await fetch(`${BASE_URL}/financial/${firId}`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch financial trail');
    }
    return response.json();
  },

  /**
   * Fetches similar past cases for a given FIR
   */
  async getSimilarCases(firId: number, userId: string, role: string): Promise<SimilarCasesResponse> {
    const response = await fetch(`${BASE_URL}/similar/${firId}`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to find similar cases');
    }
    return response.json();
  },

  /**
   * Fetches crime forecasts / early warning predictions
   */
  async getForecasts(userId: string, role: string): Promise<ForecastResponse> {
    const response = await fetch(`${BASE_URL}/forecasts`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch crime forecasts');
    }
    return response.json();
  },

  /**
   * Fetches socio-demographic crime insights
   */
  async getSocioDemographics(userId: string, role: string): Promise<SocioDemographicResponse> {
    const response = await fetch(`${BASE_URL}/socio-demographics`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch socio-demographic data');
    }
    return response.json();
  },

  /**
   * Generates and downloads a conversation PDF summary using SmartBrowz
   */
  async exportPdfReport(htmlContent: string, userId: string, role: string): Promise<Blob> {
    const response = await fetch(`${BASE_URL}/pdf-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async textToSpeech(text: string, userId: string, role: string): Promise<string> {
    const response = await fetch(`${BASE_URL}/voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async analyzeOcr(fileName: string, fileType: string, base64Data: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/ocr/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async getCdrTimeline(suspect: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/cdr/timeline?suspect=${encodeURIComponent(suspect)}`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch CDR timeline');
    }
    return response.json();
  },

  /**
   * Searches suspect databases using facial recognition similarity checks
   */
  async searchBiometrics(name: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/biometrics/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async getDispatchUnits(userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/dispatch/units`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch dispatch patrol vehicles');
    }
    return response.json();
  },

  /**
   * Fetches collaborative workspace state (pinned assets and notes)
   */
  async getWorkspaceState(userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/workspace`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch workspace state');
    }
    return response.json();
  },

  /**
   * Pins or unpins a case asset to/from the collaborative workspace
   */
  async pinWorkspaceAsset(assetType: 'fir' | 'accused', assetId: string, details: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/workspace/pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async saveWorkspaceNotes(notes: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/workspace/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async getCctnsRuns(userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/cctns/runs`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch CCTNS sync history');
    }
    return response.json();
  },

  /**
   * Triggers a CCTNS synchronization execution run
   */
  async triggerCctnsSync(triggerType: 'Manual' | 'Automatic', userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/cctns/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
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
  async getWarrants(userId: string, role: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/warrants`, {
      headers: {
        'X-User-Id': userId,
        'X-User-Role': role,
      },
    });
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
    userId: string,
    role: string
  ): Promise<any> {
    const response = await fetch(`${BASE_URL}/warrants/bulk`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': userId,
        'X-User-Role': role,
      },
      body: JSON.stringify({ firIds, newStatus, assignedOfficer, urgencyNote }),
    });
    if (!response.ok) {
      throw new Error('Failed to bulk-update warrants');
    }
    return response.json();
  },
};

