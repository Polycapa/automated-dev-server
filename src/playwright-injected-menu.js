/* eslint-disable import/extensions */
/* eslint-disable import/no-unresolved */
/* eslint-disable max-classes-per-file */
import {
  css,
  html,
  LitElement,
  nothing,
} from 'https://cdn.jsdelivr.net/gh/lit/dist@2/core/lit-core.min.js';

export class Menu extends LitElement {
  static properties = {
    contexts: {
      attribute: false,
      type: Array,
    },
    listOpened: {
      type: Boolean,
      state: true,
    },
    running: {
      type: Boolean,
      state: true,
    },
    contextsErrors: {
      type: Array,
      state: true,
    },
  };

  static styles = css`
    .menu {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(5px);
      border: 1px solid #eaeaea;
      z-index: 1000000;
      border-radius: 4px;
    }

    .contexts {
      max-height: 70vh;
      overflow-y: auto;
    }

    .button-menu {
      padding: 5px;
      background: #bdbdbd;
      border: 1px solid #eaeaea;
      border-radius: 4px;
      cursor: pointer;
    }

    .menu-buttons {
      display: flex;
      justify-content: space-around;
      align-items: center;
      padding: 5px;
      border-bottom: 1px solid #eaeaea;
    }

    .run-context-button {
      background: #01bd11;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
      font-weight: bold;
    }

    .run-context-button:disabled {
      background: #bdbdbd;
      cursor: not-allowed;
    }

    .open-context-button {
      background: #bd7e01;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
    }

    .duplicate-context-button {
      background: #5a02c6;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
    }

    .delete-context-button {
      background: red;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
    }

    .context {
      padding: 10px;
      border-bottom: 1px solid #eaeaea;
      display: flex;
      flex-direction: column;
    }

    .context:hover {
      background: #f5f5f5;
    }

    .context:first-child {
      margin-top: 5px;
    }

    .context:last-child {
      border-bottom: none;
      margin-bottom: 5px;
    }

    .context-name {
      flex: 1;
      padding: 5px;
    }

    .context-buttons {
      display: flex;
      justify-content: space-between;
    }
  `;

  get dialog() {
    return this.renderRoot?.querySelector('playwright-context-dialog');
  }

  currentContext = undefined;

  constructor() {
    super();
    this.contexts = [];
    this.listOpened = false;
    this.running = false;
    this.contextsErrors = [];
  }

  render() {
    return html`<div class="menu">
      <div class="menu-buttons">
        <button
          class="button-menu"
          @click=${() => {
            this.listOpened = !this.listOpened;
          }}
        >
          Open Playwright contexts menu
        </button>

        ${this.listOpened
          ? html` <button class="button-menu" @click=${this.#openAddDialog}>
              Add context
            </button>`
          : nothing}
      </div>
      <div class="contexts">${this.#getContextList()}</div>
      <playwright-context-dialog
        @save-context=${this.#saveContext}
      ></playwright-context-dialog>
    </div>`;
  }

  #getContextList() {
    if (this.listOpened && this.contexts) {
      return html`${this.contexts.map(
        ({ value }, index) => html`<div class="context">
          <span class="context-name">${value}</span>
          <div class="context-buttons">
            <button
              ?disabled=${this.running}
              @click=${() => this.#contextSelected(value, index)}
              class="run-context-button"
            >
              Run
            </button>
            <button
              @click=${() => this.#openContext(value)}
              class="open-context-button"
            >
              Open
            </button>
            <button
              @click=${() => this.#duplicateContext(value)}
              class="duplicate-context-button"
            >
              Duplicate
            </button>
            <button
              @click=${() => this.#deleteContext(value)}
              class="delete-context-button"
            >
              Delete
            </button>
          </div>

          ${this.#getContextError(index)}
        </div>`
      )} `;
    }

    return html``;
  }

  async #contextSelected(value, index) {
    if (!this.running) {
      this.running = true;
      this.contextsErrors[index] = undefined;
      this.requestUpdate();

      const error = await window.playwrightContextSelected(value);
      if (error) {
        this.contextsErrors[index] = error;
      }
      this.running = false;
      this.requestUpdate();
    }
  }

  #getContextError(index) {
    if (this.contextsErrors[index]) {
      return html`<pre style="color: red">${this.contextsErrors[index]}</pre>`;
    }
    return nothing;
  }

  #openContext(contextName) {
    const currentContext = this.contexts.find(
      ({ value }) => value === contextName
    );
    this.dialog?.open(currentContext);
  }

  #openAddDialog() {
    this.dialog?.open();
  }

  #deleteContext(contextName) {
    this.contexts = this.contexts.filter(({ value }) => value !== contextName);
    this.dispatchEvent(
      new CustomEvent('delete-context', {
        detail: contextName,
        composed: true,
      })
    );
  }

  #duplicateContext(contextName) {
    const currentContext = this.contexts.find(
      ({ value }) => value === contextName
    );
    if (currentContext) {
      this.dialog?.open({
        ...currentContext,
        value: '',
      });
    }
  }

  #saveContext({ detail }) {
    this.dispatchEvent(
      new CustomEvent('save-context', {
        detail,
        composed: true,
      })
    );
  }
}

export class ContextDialog extends LitElement {
  static properties = {
    actions: {
      type: Array,
      state: true,
    },
    name: {
      type: String,
      state: true,
    },
    edit: {
      type: Boolean,
      state: true,
    },
    dataUpdated: {
      type: Boolean,
      state: true,
    },
  };

  static styles = css`
    dialog {
      border: 1px solid #eaeaea;
      padding: 10px;
      border-radius: 4px;
      min-width: 400px;
    }

    dialog::backdrop {
      background: rgba(255, 255, 255, 0.5);
      backdrop-filter: blur(5px);
    }

    .dialog-buttons {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #eaeaea;
      padding-top: 10px;
    }

    .cancel-button {
      padding: 5px;
      background: #ededed;
      border: 1px solid #eaeaea;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
    }

    .edit-button {
      padding: 5px;
      background: #d2a400;
      border-radius: 4px;
      cursor: pointer;
      margin-right: 10px;
      border: none;
    }

    .ok-button {
      background: #01bd11;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
    }

    .ok-button:disabled {
      background: #ededed;
      cursor: not-allowed;
      color: #bdbdbd;
    }

    .title {
      padding: 5px;
      border-bottom: 1px solid #eaeaea;
      font-size: 1.2em;
    }

    .name-input {
      display: flex;
    }

    .name-input input {
      margin-left: 10px;
      flex: 1;
    }

    .action {
      padding: 5px;
      border-bottom: 1px solid #eaeaea;
      cursor: pointer;
      display: flex;
    }

    .action:hover {
      background: #f5f5f5;
    }

    .action:first-child {
      border-top: 1px solid #eaeaea;
      margin-top: 5px;
    }

    .action:last-child {
      margin-bottom: 5px;
    }

    .actions {
      display: flex;
      flex-direction: column;
    }

    .delete-button {
      background: red;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
    }

    .up-down-button {
      background: #00a6ff;
      border-radius: 4px;
      padding: 5px;
      color: white;
      cursor: pointer;
      border: none;
      margin: 0 5px 0 5px;
    }
  `;

  get dialog() {
    return this.renderRoot?.querySelector('dialog');
  }

  constructor() {
    super();
    this.actions = [];
    this.name = '';
    this.edit = false;
    this.dataUpdated = false;
  }

  render() {
    return html`<dialog>
      <form method="dialog">
        <h1 class="title">Context</h1>
        <div class="name-input">
          <label for="name">Name</label>
          <input
            type="text"
            name="name"
            placeholder="Context name"
            id="name"
            .value="${this.name}"
            @change=${this.#onNameChange}
          />
        </div>
        <div class="actions">
          ${this.actions.map((action, index) => this.#getAction(action, index))}
        </div>
        <playwright-add-action
          @add-action=${this.#addAction}
        ></playwright-add-action>
        <div class="dialog-buttons">
          <button class="cancel-button" value="reset">Cancel</button>
          <button class="edit-button" @click=${this.#toggleEdit}>
            Edit actions
          </button>
          <button
            class="ok-button"
            value="default"
            ?disabled="${!this.name ||
            this.actions.length === 0 ||
            !this.dataUpdated}"
            @click=${this.#saveContext}
          >
            Save
          </button>
        </div>
      </form>
    </dialog>`;
  }

  open({ actions = [], value = '' } = {}) {
    this.actions = actions;
    this.name = value;
    this.dialog?.showModal();
  }

  #toggleEdit(event) {
    event.preventDefault();
    this.edit = !this.edit;
  }

  #addAction({ detail: action }) {
    this.actions = [...this.actions, action];
    this.dataUpdated = true;
  }

  #deleteAction(index) {
    this.actions = this.actions.filter((_, i) => i !== index);
    this.dataUpdated = true;
  }

  #updateAction({ detail: { action, index } }) {
    this.actions = this.actions.map((a, i) => (i === index ? action : a));
    this.dataUpdated = true;
  }

  #getAction(action, index) {
    if (this.edit) {
      return html`<playwright-add-action
        @update-action=${this.#updateAction}
        .action=${action}
        .index=${index}
      ></playwright-add-action>`;
    }
    const div = (actionTemplate) =>
      html`<div class="action">${actionTemplate}</div>`;
    const indexTemplate = html`<b>Action ${index + 1}:</b>&nbsp;`;
    const buttons = html` ${index > 0
        ? html`<button
            class="up-down-button"
            @click=${() => this.#upAction(index)}
          >
            Up
          </button>`
        : nothing}
      ${index < this.actions.length - 1
        ? html`<button
            class="up-down-button"
            @click=${() => this.#downAction(index)}
          >
            Down
          </button>`
        : nothing}
      <button class="delete-button" @click=${() => this.#deleteAction(index)}>
        Delete
      </button>`;

    const content = (str) => html`<span style="flex: 1">${str}</span>`;
    switch (action.type) {
      case 'click':
        return div(
          html`${indexTemplate} ${content(`Click on ${action.selector}`)}
          ${buttons}`
        );
      case 'fill':
        return div(
          html`${indexTemplate}
          ${content(`Fill ${action.selector} with ${action.value}`)} ${buttons}`
        );
      case 'select-option':
        return div(
          html`${indexTemplate}
          ${content(`Select option ${action.value} in ${action.selector} `)}
          ${buttons}`
        );
      case 'wait-for':
        return div(
          html`${indexTemplate}
          ${content(`Wait for ${action.selector} to be visible`)} ${buttons}`
        );
      case 'focus':
        return div(
          html`${indexTemplate} ${content(`Focus on ${action.selector}`)}
          ${buttons}`
        );
      case 'wait-for-load-state':
        return div(
          html`${indexTemplate} ${content(`Wait for ${action.value}`)}
          ${buttons}`
        );
      case 'scroll-into-view':
        return div(
          html`${indexTemplate}
          ${content(`Scroll ${action.selector} into view`)} ${buttons}`
        );
      case 'go-to':
        return div(
          html`${indexTemplate} ${content(`Go to ${action.value}`)} ${buttons}`
        );
      case 'press':
        return div(
          html`${indexTemplate}
          ${content(`Press key ${action.value} on ${action.selector} `)}
          ${buttons}`
        );
      case 'type':
        return div(
          html`${indexTemplate}
          ${content(`Type ${action.value} in ${action.selector} `)} ${buttons}`
        );
      default:
        return nothing;
    }
  }

  #upAction(index) {
    const [action] = this.actions.splice(index, 1);
    this.actions.splice(index - 1, 0, action);
    this.actions = [...this.actions];
    this.dataUpdated = true;
  }

  #downAction(index) {
    const [action] = this.actions.splice(index, 1);
    this.actions.splice(index + 1, 0, action);
    this.actions = [...this.actions];
    this.dataUpdated = true;
  }

  #saveContext() {
    if (!this.name || this.actions.length === 0) {
      return;
    }

    this.dataUpdated = false;

    this.dispatchEvent(
      new CustomEvent('save-context', {
        detail: {
          value: this.name,
          actions: this.actions,
        },
        composed: true,
      })
    );

    this.dialog?.close();
  }

  #onNameChange({ target: { value } }) {
    this.name = value;
    this.dataUpdated = !!value;
  }
}

export class AddAction extends LitElement {
  static properties = {
    action: {
      type: Object,
    },
    index: {
      type: Number,
    },
  };

  static styles = css`
    .add-action {
      padding: 5px 0 5px 0;
      display: flex;
      align-items: center;
    }

    .element {
      margin-left: 5px;
      margin-right: 5px;
    }

    .element:first-child {
      margin-left: 0;
    }

    .element:last-child {
      margin-right: 0;
    }

    .add-button {
      background: #eaa000;
      border-radius: 4px;
      padding: 5px;
      color: black;
      cursor: pointer;
      border: none;
    }
  `;

  get selectorInput() {
    return this.renderRoot?.querySelector('#selector');
  }

  get selector() {
    return this.selectorInput?.value;
  }

  get fillValueInput() {
    return this.renderRoot?.querySelector('#fillValue');
  }

  get fillValue() {
    return this.fillValueInput?.value;
  }

  set action(value) {
    const oldValue = this.#action;
    this.#action = {
      selector: '',
      value: '',
      ...value,
    };
    this.requestUpdate('action', oldValue);
  }

  get action() {
    return this.#action;
  }

  #action = {};

  constructor() {
    super();
    this.action = {
      selector: '',
      type: '',
      value: '',
    };
  }

  render() {
    return html`<div class="tips">
        <ul>
          <li>Use <code>$input</code> to have a dynamic value</li>
          <li>Use <code>env:<ENV_VARIABLE></code> to have a value from environment</li>
        </ul>
      </div>
      <div class="add-action">
        <span class="element">I want to</span>
        <select class="element" @change=${this.#typeChanged} .value=${
      this.action.type
    }>
          <option value="click">click</option>
          <option value="fill">fill</option>
          <option value="type">type</option>
          <option value="press">press</option>
          <option value="focus">focus</option>
          <option value="go-to">go to</option>
          <option value="scroll-into-view">scroll into view</option>
          <option value="select-option">select option</option>
          <option value="wait-for-load-state">wait for load state</option>
          <option value="wait-for">wait for</option>
        </select>
        ${this.#handleType()}
        ${
          this.action.type
            ? html`<button class="add-button element" @click=${this.#addAction}>
                ${this.index === undefined ? 'Add' : 'Update'}
              </button>`
            : nothing
        }
      </div> `;
  }

  #handleType() {
    const selectorInput = html`<input
      id="selector"
      class="element"
      type="text"
      placeholder="Selector"
      .value=${this.action.selector}
    />`;
    const fillValueInput = html`<textarea
      id="fillValue"
      class="element"
      type="text"
      placeholder="Value"
      .value=${this.action.value}
    /></textarea>`;
    switch (this.action.type) {
      case 'click':
      case 'wait-for':
      case 'scroll-into-view':
      case 'focus':
        return html`<span class="element">element</span> ${selectorInput} `;
      case 'fill':
        return html`<span class="element">element</span>
          ${selectorInput}
          <span class="element">with value</span>
          ${fillValueInput} `;
      case 'press':
        return html`<span class="element">key</span>
          ${fillValueInput}
          <span class="element">in element</span>
          ${selectorInput} `;
      case 'type':
        return html`<span class="element">key</span>
          ${fillValueInput}
          <span class="element">on element</span>
          ${selectorInput} `;
      case 'select-option':
        return html` ${fillValueInput}
          <span class="element">in element</span>
          ${selectorInput}`;
      case 'wait-for-load-state':
        return html`<select id="fillValue" class="element">
          <option value="load">load</option>
          <option value="domcontentloaded">dom content loaded</option>
          <option value="networkidle">networkidle</option>
        </select>`;
      case 'go-to':
        return html`<span class="element">url</span> ${fillValueInput}`;

      default:
        return nothing;
    }
  }

  #addAction() {
    const action = {
      ...this.action,
      selector: this.selector,
      value: this.fillValue,
    };

    if (this.index !== undefined && this.index > -1) {
      this.dispatchEvent(
        new CustomEvent('update-action', {
          detail: {
            action,
            index: this.index,
          },
          composed: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('add-action', {
          detail: action,
          composed: true,
        })
      );

      const inputs = this.renderRoot?.querySelectorAll('input');

      inputs.forEach((input) => {
        // eslint-disable-next-line no-param-reassign
        input.value = '';
      });
    }
  }

  #typeChanged(e) {
    this.action = {
      ...this.action,
      type: e.target.value,
    };
  }
}

customElements.define('playwright-injected-menu', Menu);
customElements.define('playwright-context-dialog', ContextDialog);
customElements.define('playwright-add-action', AddAction);
