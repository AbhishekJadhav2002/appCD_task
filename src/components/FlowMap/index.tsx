import React, { useCallback, useRef, useState } from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  EdgeChange,
  MiniMap,
  Node,
  NodeChange,
  ReactFlowInstance,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import nodeLogger from "./MapLogger";
import "./styles.css";

const initialNodes: Node[] = [
  { id: "1", position: { x: 0, y: 0 }, data: { label: "Main Node" } },
];

const initialEdges: Edge[] = [];

function MindMap(props: { className?: string; log?: boolean }) {
  const { className, log } = props;

  const [nodes, setNodes, onNodesChange] = useNodesState<{ label: string }>(
    initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<{ label: string }>(
    initialEdges
  );
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance<{ label: string }>>();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeChange = useCallback(
    (changes: NodeChange[]) => {
      if (log) {
        changes.map((change) => {
          nodeLogger(change);
        });
      }
      onNodesChange(changes);
    },
    [onNodesChange, log]
  );

  const onEdgeChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const onNodesDelete = useCallback(
    (nodesToDelete: Node[]) => {
      if (log) {
        nodesToDelete.map((node) => {
          nodeLogger({ type: "remove", id: node.id });
        });
      }
    },
    [log]
  );

  const createNode = useCallback(
    (parentNode: Node<{ label: string }> | null = null) => {
      const newNode = {
        id: uuidv4(),
        data: { label: "New Node" },
        position: { x: 0, y: 0 },
      };

      if (parentNode) {
        newNode.position = {
          x: parentNode.position.x + 200,
          y: parentNode.position.y,
        };
        setEdges((eds) => [
          ...eds,
          { id: uuidv4(), source: parentNode.id, target: newNode.id },
        ]);
      } else if (reactFlowInstance) {
        const { x, y } = reactFlowInstance.screenToFlowPosition({
          x: 100,
          y: 100,
        });
        newNode.position = { x, y };
      }

      setNodes((nds) => nds.concat(newNode));
      if (log) nodeLogger({ item: newNode, type: "add" });
    },
    [setNodes, setEdges, reactFlowInstance, log]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      );
    },
    [setNodes, setEdges]
  );

  const moveNodeUnder = useCallback(
    (nodeId: string, targetId: string) => {
      setNodes((nds) => {
        const node = nds.find((n) => n.id === nodeId);
        const target = nds.find((n) => n.id === targetId);
        if (node && target) {
          node.position = {
            x: target.position.x + 200,
            y: target.position.y + 100,
          };
          onNodeChange([{ id: nodeId, type: "position" }]);
        }
        return nds;
      });
      setEdges((eds) => {
        const newEdge = { id: uuidv4(), source: targetId, target: nodeId };
        return [...eds.filter((e) => e.target !== nodeId), newEdge];
      });
    },
    [setNodes, setEdges, onNodeChange]
  );

  const onNodeDoubleClick = (_event: React.MouseEvent, node: Node) => {
    const newLabel = prompt("Enter new label:", node.data.label);
    if (newLabel !== null) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === node.id) {
            n.data = { ...n.data, label: newLabel };
          }
          return n;
        })
      );
      if (log)
        nodeLogger(
          { type: "reset", item: { ...node, data: { label: newLabel } } },
          "text"
        );
    }
  };

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey && event.key === "c") {
        event.preventDefault();
        createNode();
      } else if (event.key === "Delete") {
        const selectedNodes = nodes.filter((node) => node.selected);
        selectedNodes.forEach((node) => deleteNode(node.id));
      } else if (event.ctrlKey && event.key === "m") {
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length === 2) {
          moveNodeUnder(selectedNodes[0].id, selectedNodes[1].id);
        }
      }
    },
    [nodes, createNode, deleteNode, moveNodeUnder]
  );

  return (
    <div
      className={`h-[500px] w-full relative rounded border-2 border-transparent hover:border-black transition ${
        className ? className : ""
      }`}
      ref={reactFlowWrapper}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <div className="absolute top-2 left-2 p-2 min-w-[150px] shadow bg-slate-100 z-10">
        <ul className="flex flex-col gap-2 text-[10px]">
          <li>
            <button
              className="p-2 py-1 bg-blue-400 hover:bg-blue-600 transition text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => createNode()}
              disabled={!reactFlowInstance}
            >
              Add Node
            </button>
          </li>
          <li>
            <button
              className="p-2 py-1 bg-red-400 hover:bg-red-600 transition text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setNodes([])}
              disabled={nodes.length === 0}
            >
              Clear All
            </button>
          </li>
          <li>Double Click - Edit Node Label</li>
          <li>
            <kbd>Ctr</kbd> + <kbd>C</kbd> - Add Node
          </li>
          <li>
            <kbd>Delete</kbd> - Delete Selected Node(s)
          </li>
          <li>
            <kbd>Ctr</kbd> + <kbd>M</kbd> - Connect Selected Nodes
          </li>
        </ul>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodeChange}
        onNodesDelete={onNodesDelete}
        onEdgesChange={onEdgeChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default MindMap;
