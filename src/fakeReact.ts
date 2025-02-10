interface ComponentFunction {
  new (props: Record<string, unknown>): Component;
  (props: Record<string, unknown>): VirtualElement | string;
}
type VirtualElementType = ComponentFunction | string;

interface VirtualElementProps {
  children?: VirtualElement[];
  [propName: string]: unknown;
}
interface VirtualElement {
  type: VirtualElementType;
  props: VirtualElementProps;
}

type FiberNodeDOM = Element | Text | null | undefined;
/**
 * Fiber节点接口
 * @description React的核心数据结构，用于描述组件树和工作单元
 * @property alternate - 上一次渲染的Fiber节点
 * @property dom - 对应的真实DOM节点
 * @property effectTag - 标记节点需要执行的操作类型
 * @property child - 第一个子节点
 * @property return - 父节点
 * @property sibling - 下一个兄弟节点
 */

interface FiberNode<S = any> extends VirtualElement {
  alternate: FiberNode<S> | null;
  dom?: FiberNodeDOM;
  effectTag?: string;
  child?: FiberNode;
  return?: FiberNode;
  sibling?: FiberNode;
  hooks?: {
    state: S;
    queue: S[];
    effects?: {
      cleanup?: () => void;
      deps?: unknown[];
      effect: () => void | (() => void);
    }[];
  }[];
}

let workInProgressRoot: FiberNode | null = null;
let nextUnitOfWork: FiberNode | null = null;
let currentRoot: FiberNode | null = null;
let deletions: FiberNode[] = [];
let workInProgressFiber: FiberNode;
let hookIndex = 0;

const Fragment = Symbol.for("react.fragment");

/**
 * 实现requestIdleCallback的兼容性封装
 * @description 在浏览器空闲时执行任务的调度器
 */
((global: Window) => {
  const id = 1; //浏览器原生的 requestIdleCallback 中，调用时会返回一个标识符，在这里，id 起到的作用就是为了满足接口的一致性
  const fps = 1e3 / 60;
  let frameDeadline: number;
  let pendingCallback: IdleRequestCallback;
  const channel = new MessageChannel();
  const timeRemaining = () => frameDeadline - window.performance.now();

  const deadline = {
    didTimeout: false,
    timeRemaining,
  };

  channel.port2.onmessage = () => {
    if (typeof pendingCallback === "function") {
      pendingCallback(deadline);
    }
  };

  global.requestIdleCallback = (callback: IdleRequestCallback) => {
    global.requestAnimationFrame((frameTime) => {
      frameDeadline = frameTime + fps;
      pendingCallback = callback;
      channel.port1.postMessage(null);
    });
    return id;
  };
})(window);

const isDef = <T>(param: T): param is NonNullable<T> =>
  param !== void 0 && param !== null;

const isPlainObject = (val: unknown): val is Record<string, unknown> =>
  Object.prototype.toString.call(val) === "[object Object]" &&
  [Object.prototype, null].includes(Object.getPrototypeOf(val));

const isVirtualElement = (e: unknown): e is VirtualElement =>
  typeof e === "object";

const createTextElement = (text: string): VirtualElement => ({
  type: "TEXT",
  props: {
    nodeValue: text,
  },
});

/**
 * 创建虚拟DOM元素
 * @description 类似React.createElement的实现
 * @param type - 元素类型（原生标签名或组件函数）
 * @param props - 元素属性
 * @param children - 子元素列表
 */
const createElement = (
  type: VirtualElementType,
  props: Record<string, unknown> = {},
  ...child: (unknown | VirtualElement)[]
): VirtualElement => {
  const children = child.map((c) =>
    isVirtualElement(c) ? c : createTextElement(String(c))
  );

  return {
    type,
    props: {
      ...props,
      children,
    },
  };
};

const updateDOM = (
  DOM: NonNullable<FiberNodeDOM>,
  prevProps: VirtualElementProps,
  nextProps: VirtualElementProps
) => {
  const defaultPropKeys = "children";

  for (const [removePropKey, removePropValue] of Object.entries(prevProps)) {
    if (removePropKey.startsWith("on")) {
      DOM.removeEventListener(
        removePropKey.slice(2).toLowerCase(),
        removePropValue as EventListener
      );
    } else if (removePropKey !== defaultPropKeys) {
      // @ts-ignore
      DOM[removePropKey] = "";
    }
  }

  for (const [addPropKey, addPropValue] of Object.entries(nextProps)) {
    if (addPropKey.startsWith("on")) {
      DOM.addEventListener(
        addPropKey.slice(2).toLowerCase(),
        addPropValue as EventListener
      );
    } else if (addPropKey !== defaultPropKeys) {
      // @ts-ignore
      DOM[addPropKey] = addPropValue;
    }
  }
};

const createDOM = (fiberNode: FiberNode): FiberNodeDOM => {
  const { type, props } = fiberNode;
  let DOM: FiberNodeDOM = null;

  if (type === "TEXT") {
    DOM = document.createTextNode("");
  } else if (typeof type === "string") {
    DOM = document.createElement(type);
  }

  if (DOM !== null) {
    updateDOM(DOM, {}, props);
  }

  return DOM;
};

/**
 * 提交更改到真实DOM
 * @description 执行实际的DOM操作，这个过程不能被中断
 * 处理三种情况：
 * 1. 新增节点（REPLACEMENT）
 * 2. 更新节点（UPDATE）
 * 3. 删除节点（通过deletions数组）
 */
const commitRoot = () => {
  const findParentFiber = (fiberNode?: FiberNode) => {
    if (fiberNode) {
      let parentFiber = fiberNode.return;
      while (parentFiber && !parentFiber.dom) {
        parentFiber = parentFiber.return;
      }
      return parentFiber;
    }

    return null;
  };

  const commitDeletion = (
    parentDOM: FiberNodeDOM,
    DOM: NonNullable<FiberNodeDOM>
  ) => {
    if (isDef(parentDOM)) {
      parentDOM.removeChild(DOM);
    }
  };

  const commitReplacement = (
    parentDOM: FiberNodeDOM,
    DOM: NonNullable<FiberNodeDOM>
  ) => {
    if (isDef(parentDOM)) {
      parentDOM.appendChild(DOM);
    }
  };

  const commitWork = (fiberNode?: FiberNode) => {
    if (fiberNode) {
      if (fiberNode.dom) {
        const parentFiber = findParentFiber(fiberNode);
        const parentDOM = parentFiber?.dom;

        switch (fiberNode.effectTag) {
          case "REPLACEMENT":
            commitReplacement(parentDOM, fiberNode.dom);
            break;
          case "UPDATE":
            updateDOM(
              fiberNode.dom,
              fiberNode.alternate ? fiberNode.alternate.props : {},
              fiberNode.props
            );
            break;
          default:
            break;
        }
      }

      commitWork(fiberNode.child);
      commitWork(fiberNode.sibling);
    }
  };

  for (const deletion of deletions) {
    if (deletion.dom) {
      const parentFiber = findParentFiber(deletion);
      commitDeletion(parentFiber?.dom, deletion.dom);
    }
  }

  deletions.forEach((fiber) => {
    fiber.hooks?.forEach((hook) => {
      hook.effects?.forEach((effect) => {
        effect.cleanup?.();
      });
    });
  });

  if (workInProgressRoot !== null) {
    commitWork(workInProgressRoot.child);

    workInProgressRoot.hooks?.forEach((hook) => {
      hook.effects?.forEach((effect) => {
        const cleanup = effect.effect();
        if (typeof cleanup === "function") {
          effect.cleanup = cleanup;
        }
      });
    });
    currentRoot = workInProgressRoot;
  }

  workInProgressRoot = null;
};

const reconcileChildren = (
  fiberNode: FiberNode,
  elements: VirtualElement[] = []
) => {
  let index = 0;
  let oldFiberNode: FiberNode | undefined = void 0;
  let prevSibling: FiberNode | undefined = void 0;
  const virtualElements = elements.flat(Infinity);

  if (fiberNode.alternate?.child) {
    oldFiberNode = fiberNode.alternate.child;
  }

  while (
    index < virtualElements.length ||
    typeof oldFiberNode !== "undefined"
  ) {
    const virtualElement = virtualElements[index];
    let newFiber: FiberNode | undefined = void 0;

    const isSameType = Boolean(
      oldFiberNode &&
        virtualElement &&
        oldFiberNode.type === virtualElement.type
    );

    if (isSameType && oldFiberNode) {
      newFiber = {
        type: oldFiberNode.type,
        dom: oldFiberNode.dom,
        alternate: oldFiberNode,
        props: virtualElement.props,
        return: fiberNode,
        effectTag: "UPDATE",
      };
    }
    if (!isSameType && Boolean(virtualElement)) {
      newFiber = {
        type: virtualElement.type,
        dom: null,
        alternate: null,
        props: virtualElement.props,
        return: fiberNode,
        effectTag: "REPLACEMENT",
      };
    }
    if (!isSameType && oldFiberNode) {
      deletions.push(oldFiberNode);
    }

    if (oldFiberNode) {
      oldFiberNode = oldFiberNode.sibling;
    }

    if (index === 0) {
      fiberNode.child = newFiber;
    } else if (typeof prevSibling !== "undefined") {
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index += 1;
  }
};

const performUnitOfWork = (fiberNode: FiberNode): FiberNode | null => {
  const { type } = fiberNode;
  switch (typeof type) {
    case "function": {
      workInProgressFiber = fiberNode;
      workInProgressFiber.hooks = [];
      hookIndex = 0;
      let children: ReturnType<ComponentFunction>;

      if (Object.getPrototypeOf(type).REACT_COMPONENT) {
        const C = type;
        const component = new C(fiberNode.props);
        const [state, setState] = useState(component.state);
        component.props = fiberNode.props;
        component.state = state;
        component.setState = setState;
        children = component.render.bind(component)();
      } else {
        children = type(fiberNode.props);
      }
      reconcileChildren(fiberNode, [
        isVirtualElement(children)
          ? children
          : createTextElement(String(children)),
      ]);
      break;
    }

    case "number":
    case "string":
      if (!fiberNode.dom) {
        fiberNode.dom = createDOM(fiberNode);
      }
      reconcileChildren(fiberNode, fiberNode.props.children);
      break;
    case "symbol":
      if (type === Fragment) {
        reconcileChildren(fiberNode, fiberNode.props.children);
      }
      break;
    default:
      if (typeof fiberNode.props !== "undefined") {
        reconcileChildren(fiberNode, fiberNode.props.children);
      }
      break;
  }

  if (fiberNode.child) {
    return fiberNode.child;
  }

  let nextFiberNode: FiberNode | undefined = fiberNode;

  while (typeof nextFiberNode !== "undefined") {
    if (nextFiberNode.sibling) {
      return nextFiberNode.sibling;
    }

    nextFiberNode = nextFiberNode.return;
  }

  return null;
};

const workLoop: IdleRequestCallback = (deadline) => {
  while (nextUnitOfWork && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (!nextUnitOfWork && workInProgressRoot) {
    commitRoot();
  }

  window.requestIdleCallback(workLoop);
};

const render = (element: VirtualElement, container: Element) => {
  currentRoot = null;
  workInProgressRoot = {
    type: "div",
    dom: container,
    props: {
      children: [{ ...element }],
    },
    alternate: currentRoot,
  };
  nextUnitOfWork = workInProgressRoot;
  deletions = [];
};

abstract class Component {
  props: Record<string, unknown>;
  abstract state: unknown;
  abstract setState: (value: unknown) => void;
  abstract render: () => VirtualElement;

  constructor(props: Record<string, unknown>) {
    this.props = props;
  }

  static REACT_COMPONENT = true;
}

function useState<S>(initState: S): [S, (value: S) => void] {
  const fiberNode: FiberNode<S> = workInProgressFiber;
  const hook: {
    state: S;
    queue: S[];
  } = fiberNode?.alternate?.hooks
    ? fiberNode.alternate.hooks[hookIndex]
    : {
        state: initState,
        queue: [],
      };

  while (hook.queue.length) {
    let newState = hook.queue.shift();
    if (isPlainObject(hook.state) && isPlainObject(newState)) {
      newState = { ...hook.state, ...newState };
    }
    if (isDef(newState)) {
      hook.state = newState;
    }
  }

  if (typeof fiberNode.hooks === "undefined") {
    fiberNode.hooks = [];
  }

  fiberNode.hooks.push(hook);
  hookIndex += 1;

  const setState = (value: S) => {
    hook.queue.push(value);
    if (currentRoot) {
      workInProgressRoot = {
        type: currentRoot.type,
        dom: currentRoot.dom,
        props: currentRoot.props,
        alternate: currentRoot,
      };
      nextUnitOfWork = workInProgressRoot;
      deletions = [];
      currentRoot = null;
    }
  };

  return [hook.state, setState];
}

function useEffect(effect: () => void | (() => void), deps?: unknown[]) {
  const oldHook = workInProgressFiber.alternate?.hooks?.[hookIndex];

  const hook = {
    state: undefined,
    queue: [],
    effects: [
      {
        effect,
        deps,
        cleanup: oldHook?.effects?.[0]?.cleanup,
      },
    ],
  };

  const hasChangedDeps = oldHook?.effects?.[0]?.deps
    ? !deps?.every((dep, i) => dep === oldHook?.effects?.[0]?.deps?.[i])
    : true;

  if (hasChangedDeps) {
    oldHook?.effects?.[0]?.cleanup?.();

    const cleanup = effect();
    if (typeof cleanup === "function") {
      hook.effects[0].cleanup = cleanup;
    }
  } else {
    hook.effects =
      oldHook?.effects?.map((e) => ({
        effect: e.effect,
        deps: e.deps || [],
        cleanup: e.cleanup,
      })) || [];
  }

  if (!workInProgressFiber.hooks) {
    workInProgressFiber.hooks = [];
  }
  workInProgressFiber.hooks.push(hook);
  hookIndex++;
}

void (function main() {
  window.requestIdleCallback(workLoop);
})();

export default {
  createElement,
  render,
  useState,
  useEffect,
  Component,
  Fragment,
};
