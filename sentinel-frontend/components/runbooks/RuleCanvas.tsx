import { useCallback, useState } from 'react';
import {
    ReactFlow,
    addEdge,
    Background,
    Controls,
    Connection,
    Edge,
    Node,
    OnNodesChange,
    OnEdgesChange,
    applyNodeChanges,
    applyEdgeChanges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { ConditionBlock } from './ConditionBlock';
import { ActionBlock } from './ActionBlock';

const nodeTypes = {
    condition: ConditionBlock,
    action: ActionBlock,
};

interface RuleCanvasProps {
    nodes: Node[];
    edges: Edge[];
    onNodesChange: OnNodesChange;
    onEdgesChange: OnEdgesChange;
    onConnect: (params: Connection) => void;
    onNodeClick: (event: React.MouseEvent, node: Node) => void;
}

export function RuleCanvas({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
}: RuleCanvasProps) {
    return (
        <div className="w-full h-[600px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                nodeTypes={nodeTypes}
                fitView
                colorMode="dark"
            >
                <Background color="#1e293b" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
}
