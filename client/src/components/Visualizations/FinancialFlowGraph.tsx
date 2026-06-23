import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network/standalone';
import { Landmark, AlertTriangle, RefreshCw } from 'lucide-react';

interface FinancialNode {
  id: string;
  label: string;
  type: 'Savings' | 'UPI' | 'Hawala' | 'Shell Company' | 'Crypto' | 'Current' | string;
  suspicious: boolean;
}

interface FinancialEdge {
  from: string;
  to: string;
  label: string;
  color?: string;
}

interface FinancialFlowGraphProps {
  data: {
    nodes: FinancialNode[];
    edges: FinancialEdge[];
  };
  totalAmount?: number;
  suspiciousCount?: number;
}

const getNodeColor = (type: string): string => {
  switch (type) {
    case 'Savings':
      return '#3b82f6'; // blue
    case 'UPI':
      return '#06b6d4'; // cyan
    case 'Hawala':
      return '#ef4444'; // red
    case 'Shell Company':
      return '#f97316'; // orange
    case 'Crypto':
      return '#a855f7'; // purple
    case 'Current':
      return '#10b981'; // green
    default:
      return '#64748b'; // slate
  }
};

const formatCurrency = (amount: number): string => {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

export const FinancialFlowGraph: React.FC<FinancialFlowGraphProps> = ({
  data,
  totalAmount,
  suspiciousCount,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const formattedNodes = data.nodes.map(node => {
      const color = getNodeColor(node.type);
      return {
        id: node.id,
        label: node.label,
        shape: 'dot',
        size: node.suspicious ? 22 : 16,
        borderWidth: node.suspicious ? 4 : 2,
        color: {
          border: node.suspicious ? '#ef4444' : color,
          background: '#111827',
          highlight: {
            border: '#ffffff',
            background: color,
          },
        },
        shadow: node.suspicious
          ? { enabled: true, color: 'rgba(239, 68, 68, 0.6)', size: 15, x: 0, y: 0 }
          : false,
        font: { color: '#f3f4f6', size: 11, face: 'Inter' },
        title: `<b>${node.label}</b><br/>Type: ${node.type}${node.suspicious ? '<br/><span style="color:#ef4444">⚠ Suspicious Account</span>' : ''}`,
      };
    });

    const formattedEdges = data.edges.map(edge => {
      const isSuspicious = edge.color === 'red' || edge.color === '#ef4444';
      return {
        from: edge.from,
        to: edge.to,
        label: edge.label,
        font: { color: '#94a3b8', size: 8, face: 'Inter', strokeWidth: 0 },
        color: {
          color: isSuspicious ? '#ef4444' : (edge.color || '#475569'),
          highlight: '#ffffff',
        },
        width: isSuspicious ? 3 : 1.5,
        arrows: 'to',
        smooth: {
          enabled: true,
          type: 'curvedCW',
          roundness: 0.2,
        },
      };
    });

    const graphData = { nodes: formattedNodes, edges: formattedEdges };

    const options = {
      nodes: {
        scaling: { min: 12, max: 30 },
      },
      edges: {
        smooth: {
          enabled: true,
          type: 'continuous',
          roundness: 0.5,
        },
      },
      physics: {
        enabled: true,
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -60,
          centralGravity: 0.01,
          springLength: 120,
          springConstant: 0.06,
        },
        stabilization: {
          iterations: 120,
          fit: true,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        selectable: true,
      },
    };

    networkRef.current = new Network(containerRef.current, graphData, options);

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data]);

  const triggerResetPhysics = () => {
    if (networkRef.current) {
      networkRef.current.stabilize();
    }
  };

  return (
    <div className="card-panel rounded-lg border border-slate-800 p-6 text-slate-100 shadow-xl w-full my-4 relative">
      {/* Summary Bar */}
      <div className="flex flex-wrap gap-4 items-center mb-4 bg-slate-900/60 rounded-lg border border-slate-800/60 p-3">
        {totalAmount !== undefined && (
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-brand-primary" />
            <span className="text-xs text-slate-400">Total Volume:</span>
            <span className="text-sm font-bold text-white">{formatCurrency(totalAmount)}</span>
          </div>
        )}
        {suspiciousCount !== undefined && (
          <div className="flex items-center gap-2 ml-auto">
            <AlertTriangle size={16} className="text-red-400" />
            <span className="text-xs text-slate-400">Suspicious Transactions:</span>
            <span className="text-sm font-bold text-red-400">{suspiciousCount}</span>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Landmark className="text-brand-primary" size={20} /> Financial Flow Network
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Money trail between accounts — suspicious flows highlighted in red</p>
        </div>
        <button
          onClick={triggerResetPhysics}
          className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-md text-xs font-semibold transition"
          title="Stabilize Graph Layout"
        >
          <RefreshCw size={12} /> Re-center
        </button>
      </div>

      {/* Network Container */}
      <div
        ref={containerRef}
        className="w-full h-96 min-h-[400px] rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden cursor-grab active:cursor-grabbing"
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-slate-400 border-t border-slate-900 pt-3">
        {['Savings', 'UPI', 'Hawala', 'Shell Company', 'Crypto', 'Current'].map(type => (
          <div key={type} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full border border-white/20"
              style={{ backgroundColor: getNodeColor(type) }}
            />
            <span>{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <span className="w-6 border-t-2 border-red-500 inline-block" />
          <span>Suspicious Flow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full border-2 border-red-500 bg-transparent shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
          <span>Suspicious Account</span>
        </div>
      </div>
    </div>
  );
};
