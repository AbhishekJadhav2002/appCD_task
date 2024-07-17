import { NodeChange } from "reactflow";

export enum NodeChangeType {
  ADD = "add",
  REMOVE = "remove",
  POSITION = "position",
  SELECT = "select",
  DIMENSIONS = "dimensions",
  RESET = "reset",
}
const nodeLogger = (change: NodeChange, type?: "text") => {
  if (type === "text") {
    console.log(
      `TextChanged:${type}:${"id" in change ? change.id : change.item.id}:${
        "item" in change ? change.item.data.label : ""
      }`
    );
  } else if (change.type === NodeChangeType.ADD) {
    console.log(`NodeAdded:${change.item.id}:${change.item.data.label}`);
  } else if (change.type === NodeChangeType.REMOVE) {
    console.log(`NodeRemoved:${change.id}:`);
  } else if (change.type === NodeChangeType.POSITION) {
    console.log(`NodeMoved:${change.id}:`);
  }
};

export default nodeLogger;
