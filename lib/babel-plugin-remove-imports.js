/* eslint-env node */
'use strict';

const path = require('path');

function removeImports() {
  let importDeclarationsToRemove, filteredImports;

  return {
    name: 'remove-filtered-imports',
    visitor: {
      Program: {
        enter(_, state) {
          filteredImports = state.opts instanceof Array ? state.opts : (state.opts ? [state.opts] : []);
          importDeclarationsToRemove = [];
        },
        exit() {
          importDeclarationsToRemove.forEach(function(declaration) {
            declaration.remove();
          });

          importDeclarationsToRemove = undefined;
        }
      },

      ImportDeclaration(path) {
        const name = path.node.source.value;

        if (filteredImports.indexOf(name) !== -1) {
          importDeclarationsToRemove.push(path);
        }
      }

    }
  };
}

removeImports.baseDir = function() {
  return path.join(__dirname, '../');
};

module.exports = removeImports;
