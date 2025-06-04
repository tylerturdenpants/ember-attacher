import Component from '@glimmer/component';

export default class AttachPopover extends Component {
  get ariaRole() {
    return this.args.ariaRole || 'dialog';
  }
} 