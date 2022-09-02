interface IAction {
  selector: string;
  type:
    | 'click'
    | 'fill'
    | 'focus'
    | 'go-to'
    | 'scroll-into-view'
    | 'select-option'
    | 'wait-for'
    | 'wait-for-load-state';
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

export type Action =
  | ClickAction
  | FillAction
  | FocusAction
  | GoToAction
  | ScrollIntoViewAction
  | SelectOptionAction
  | WaitForAction
  | WaitForLoadStateAction;
