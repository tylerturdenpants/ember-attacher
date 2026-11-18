import { cancel, schedule } from '@ember/runloop';
import { isHTMLSafe } from '@ember/template';
import AttacherCore, { resolveTooltipClass } from './attacher-core.js';

const poolsByDocument = new WeakMap();
const BASE_ARGS = Object.freeze({ ariaRole: 'tooltip' });

/**
 * Imperative DOM host rendering the shared singleton tooltip element from
 * read-only `AttacherCore` render snapshots.
 */
class TooltipDomHost {
  doc = null;
  hostEl = null;
  innerEl = null;
  contentEl = null;
  arrowEl = null;
  fillEl = null;

  constructor(doc) {
    this.doc = doc;
  }

  _createElements() {
    const host = this.doc.createElement('div');
    host.className = 'ember-attacher';
    host.setAttribute('aria-hidden', 'true');
    host.style.display = 'none';

    const inner = this.doc.createElement('div');
    const content = this.doc.createElement('span');
    content.className = 'ember-attacher-tooltip-content';

    const arrow = this.doc.createElement('div');
    arrow.className = 'ember-attacher-arrow';
    arrow.setAttribute('x-arrow', '');

    const fill = this.doc.createElement('div');
    fill.className = 'ember-attacher-fill-backdrop';
    fill.setAttribute('aria-hidden', 'true');
    const circle = this.doc.createElement('div');
    circle.setAttribute('x-circle', '');
    fill.appendChild(circle);

    inner.appendChild(content);
    host.appendChild(inner);

    this.hostEl = host;
    this.innerEl = inner;
    this.contentEl = content;
    this.arrowEl = arrow;
    this.fillEl = fill;
  }

  sync(state, onHostMounted) {
    if (!state.activeElement || (!state.hasContent && !this.hostEl)) {
      return;
    }

    if (!this.hostEl) {
      this._createElements();
    }

    const container = state.container || this.doc.body;
    if (container && this.hostEl.parentNode !== container) {
      container.appendChild(this.hostEl);
    }

    onHostMounted(this.hostEl, state.arrow ? this.arrowEl : null);

    if (this.hostEl.id !== state.id) {
      this.hostEl.id = state.id;
    }

    if (this.hostEl.getAttribute('role') !== state.role) {
      this.hostEl.setAttribute('role', state.role);
    }

    if (state.popoverAttr === 'manual') {
      if (this.hostEl.getAttribute('popover') !== 'manual') {
        this.hostEl.setAttribute('popover', 'manual');
      }
    } else if (this.hostEl.hasAttribute('popover')) {
      this.hostEl.removeAttribute('popover');
    }

    if (state.hasContent || !state.isHiding) {
      if (this.contentEl.textContent !== state.text) {
        this.contentEl.textContent = state.text;
      }
    }

    if (this.innerEl.className !== state.className) {
      this.innerEl.className = state.className;
    }

    if (state.style && isHTMLSafe(state.style)) {
      const cssText = state.style.toString();
      if (this.innerEl.getAttribute('style') !== cssText) {
        this.innerEl.setAttribute('style', cssText);
      }
    } else if (this.innerEl.hasAttribute('style')) {
      this.innerEl.removeAttribute('style');
    }

    if (state.arrow) {
      if (this.arrowEl.parentNode !== this.innerEl) {
        this.innerEl.appendChild(this.arrowEl);
      }
    } else if (this.arrowEl.parentNode === this.innerEl) {
      this.innerEl.removeChild(this.arrowEl);
    }

    if (state.isFillAnimation) {
      if (this.fillEl.parentNode !== this.innerEl) {
        this.innerEl.appendChild(this.fillEl);
      }
    } else if (this.fillEl.parentNode === this.innerEl) {
      this.innerEl.removeChild(this.fillEl);
    }
  }

  destroy() {
    if (this.hostEl?.parentNode) {
      this.hostEl.parentNode.removeChild(this.hostEl);
    }
    this.hostEl = null;
    this.innerEl = null;
    this.contentEl = null;
    this.arrowEl = null;
    this.fillEl = null;
  }
}

class SingletonTooltipPool {
  doc = null;
  host = null;
  core = null;
  _visibilitySyncTimers = new Map();

  constructor(doc) {
    this.doc = doc;
    this.host = new TooltipDomHost(doc);
    this.core = new AttacherCore(null, () => BASE_ARGS, {
      defaultConfigKey: 'tooltip',
      defaultAriaRole: 'tooltip',
      allowParentFallback: false,
      isComponentHost: false,
      getAdditionalClass: () => resolveTooltipClass(this.core?.envConfig),
      onRenderStateChange: (state) =>
        this.host.sync(state, (floatingEl, arrowEl) =>
          this.core?.setHostElements(floatingEl, arrowEl)
        ),
    });
  }

  register(element, text, namedOptions, owner) {
    if (!this.core || this.core.isDestroyed) {
      return;
    }

    const normalizedOptions =
      namedOptions && typeof namedOptions === 'object' ? namedOptions : null;

    this.core.registerTargetElement(element, text, normalizedOptions, owner);

    const prevTimer = this._visibilitySyncTimers.get(element);
    if (prevTimer) {
      cancel(prevTimer);
      this._visibilitySyncTimers.delete(element);
    }

    const controlledIsShown = normalizedOptions?.isShown;
    if (controlledIsShown !== true && controlledIsShown !== false) {
      return;
    }

    // Defer tracked visibility transitions out of Modifier.modify()'s tracking frame.
    const timer = schedule('actions', () => {
      this._visibilitySyncTimers.delete(element);
      if (!this.core || this.core.isDestroyed) {
        return;
      }

      const isActive = this.core.isActiveTarget(element);
      const isOpen = this.core.liveIsShown || !this.core.isHidden;

      if (controlledIsShown === true && (!isActive || !this.core.liveIsShown)) {
        this.core.show(element, text);
      } else if (controlledIsShown === false && isActive && isOpen) {
        this.core.hide();
      }
    });
    this._visibilitySyncTimers.set(element, timer);
  }

  unregister(element) {
    const timer = this._visibilitySyncTimers.get(element);
    if (timer) {
      cancel(timer);
      this._visibilitySyncTimers.delete(element);
    }

    this.core?.unregisterTargetElement(element);

    if (!this.core || this.core.entryCount === 0) {
      this.destroy();
    }
  }

  destroy() {
    for (const timer of this._visibilitySyncTimers.values()) {
      cancel(timer);
    }
    this._visibilitySyncTimers.clear();

    if (this.doc) {
      poolsByDocument.delete(this.doc);
    }
    this.core?.destroy();
    this.core = null;
    this.host?.destroy();
    this.host = null;
  }
}

/**
 * Get or create the document-scoped singleton tooltip pool.
 *
 * @param {Element} element
 * @returns {SingletonTooltipPool | null}
 */
export function getTooltipPool(element) {
  const doc =
    element?.ownerDocument || (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    return null;
  }

  let pool = poolsByDocument.get(doc);
  if (!pool) {
    pool = new SingletonTooltipPool(doc);
    poolsByDocument.set(doc, pool);
  }
  return pool;
}
