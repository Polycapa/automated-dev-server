interface IAction {
  selector: string;
  type:
    | 'click'
    | 'fill'
    | 'focus'
    | 'go-to'
    | 'press'
    | 'run-context'
    | 'scroll-into-view'
    | 'select-option'
    | 'type'
    | 'wait-for-load-state'
    | 'wait-for';
}

export interface ClickAction extends IAction {
  type: 'click';
}

export interface FillAction extends IAction {
  type: 'fill';
  value: string;
}

export interface SelectOptionAction extends IAction {
  type: 'select-option';
  value: string;
}

export interface WaitForAction extends IAction {
  type: 'wait-for';
}

export interface FocusAction extends IAction {
  type: 'focus';
}

export type WaitForLoadStateAction = Omit<IAction, 'selector'> & {
  type: 'wait-for-load-state';

  value: string;
};

export type GoToAction = Omit<IAction, 'selector'> & {
  type: 'go-to';
  value: string;
};

export interface ScrollIntoViewAction extends IAction {
  type: 'scroll-into-view';
}

export interface PressAction extends IAction {
  type: 'press';
  value: string;
}

export interface TypeAction extends IAction {
  type: 'type';
  value: string;
}

export interface RunContextAction extends IAction {
  type: 'run-context';
  value: string;
}

export type Action =
  | ClickAction
  | FillAction
  | FocusAction
  | GoToAction
  | PressAction
  | RunContextAction
  | ScrollIntoViewAction
  | SelectOptionAction
  | TypeAction
  | WaitForAction
  | WaitForLoadStateAction;
