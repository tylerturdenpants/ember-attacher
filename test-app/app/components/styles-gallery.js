import Component from '@glimmer/component';

export default class StylesGallery extends Component {
  examples = [
    {
      label: 'top',
      placement: 'top',
      animation: 'fade',
      text: 'Hello world!',
      arrow: true,
    },
    {
      label: 'bottom',
      placement: 'bottom',
      animation: 'fade',
      text: 'Hello world!',
      arrow: true,
    },
    {
      label: 'left',
      placement: 'left',
      animation: 'fade',
      text: 'Hello world!',
      arrow: true,
    },
    {
      label: 'right',
      placement: 'right',
      animation: 'fade',
      text: 'Hello world!',
      arrow: true,
    },
    {
      label: 'light theme',
      placement: 'top',
      animation: 'fade',
      text: 'Light chrome',
      arrow: true,
      tooltipClass: 'ember-attacher-light-theme',
    },
    {
      label: 'fill',
      placement: 'bottom',
      animation: 'fill',
      text: 'Fill animation',
      arrow: false,
    },
    {
      label: 'shift',
      placement: 'top',
      animation: 'shift',
      text: 'Shift',
      arrow: true,
    },
    {
      label: 'scale',
      placement: 'bottom',
      animation: 'scale',
      text: 'Scale',
      arrow: true,
    },
    {
      label: 'none',
      placement: 'left',
      animation: 'none',
      text: 'None',
      arrow: true,
    },
    {
      label: 'perspective',
      placement: 'right',
      animation: 'perspective',
      text: 'Perspective',
      arrow: true,
    },
  ];
}
