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
  const [error, setError] = useState<string | null>(null);

  const isValidConnection = useCallback(
    (connection: Connection): boolean => {
      const { source, target } = connection;

      const targetHasParent = edges.some((edge) => edge.target === target);
      if (targetHasParent) {
        setError("A node can only have one parent in a tree structure.");
        return false;
      }

      if (!source || !target) {
        setError("Invalid connection.");
        return false;
      }

      if (source === target) {
        setError("Cannot connect a node to itself.");
        return false;
      }

      const isDescendant = (childId: string, parentId: string): boolean => {
        const childEdge = edges.find((e) => e.target === childId);
        if (!childEdge) return false;
        if (childEdge.source === parentId) return true;
        return isDescendant(childEdge.source, parentId);
      };

      if (isDescendant(source, target)) {
        setError(
          "This connection would create a cycle, which is not allowed in a tree structure."
        );
        return false;
      }

      setError(null);
      return true;
    },
    [edges]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (isValidConnection(params)) {
        setEdges((eds) => addEdge(params, eds));
      }
    },
    [setEdges, isValidConnection]
  );

  const onNodeChange = useCallback(
    (changes: NodeChange[]) => {
      if (log) {
        changes.forEach((change) => {
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
        nodesToDelete.forEach((node) => {
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
      setNodes((nds) => {
        const nodesToDelete = new Set([nodeId]);
        const findChildrenRecursively = (id: string) => {
          nds.forEach((node) => {
            if (
              edges.some(
                (edge) => edge.source === id && edge.target === node.id
              )
            ) {
              nodesToDelete.add(node.id);
              findChildrenRecursively(node.id);
            }
          });
        };
        findChildrenRecursively(nodeId);
        return nds.filter((node) => !nodesToDelete.has(node.id));
      });
      setEdges((eds) =>
        eds.filter(
          (edge) =>
            !edge.source.startsWith(nodeId) && !edge.target.startsWith(nodeId)
        )
      );
    },
    [setNodes, setEdges, edges]
  );

  const moveNodeUnder = useCallback(
    (nodeId: string, targetId: string) => {
      if (nodeId === targetId) return;

      const isDescendant = (childId: string, parentId: string): boolean => {
        const childEdge = edges.find((e) => e.target === childId);
        if (!childEdge) return false;
        if (childEdge.source === parentId) return true;
        return isDescendant(childEdge.source, parentId);
      };

      if (isDescendant(targetId, nodeId)) {
        setError("Cannot move a node under its own descendant.");
        return;
      }

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
      setError(null);
    },
    [setNodes, setEdges, onNodeChange, edges]
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
        const selectedNodes = nodes.filter((node) => node.selected);
        if (selectedNodes.length === 1) {
          createNode(selectedNodes[0]);
        } else {
          createNode();
        }
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

  const onErrorClick = useCallback(() => {
    setError(null);
  }, []);

  return (
    <div
      className={`h-[500px] w-full relative rounded border-2 border-transparent hover:border-black transition ${
        className ? className : ""
      }`}
      ref={reactFlowWrapper}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {error && (
        <div className="absolute top-2 right-2 flex items-center space-between p-2 bg-red-100 text-red-700 rounded z-20 text-sm">
          {error}
          <button
            className="p-1 py-0 ml-2 bg-red-400 hover:bg-red-600 transition text-white rounded"
            onClick={onErrorClick}
          >
            Dismiss
          </button>
        </div>
      )}
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
            <kbd>Ctrl</kbd> + <kbd>C</kbd> - Add Node
          </li>
          <li>
            <kbd>Delete</kbd> - Delete Selected Node(s)
          </li>
          <li>
            <kbd>Ctrl</kbd> + <kbd>M</kbd> - Move Selected Node Under Another
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
