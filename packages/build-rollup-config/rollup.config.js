const autoExternal = require('rollup-plugin-auto-external')
const commonjs = require('@rollup/plugin-commonjs')
const path = require('path')
const typescript = require('@rollup/plugin-typescript')
const replace = require('@rollup/plugin-replace')
const copy = require('rollup-plugin-copy')
const license = require('rollup-plugin-license')
const css = require('rollup-plugin-css-only')
const terser = require('@rollup/plugin-terser')
const outputManifest = require('rollup-plugin-output-manifest').default
const hasher = require('node-object-hash')
const { string } = require('rollup-plugin-string')
const resolve = require('@rollup/plugin-node-resolve').default
const rpi_ast_macros = require('rollup-plugin-ast-macros')
const del = require('rollup-plugin-delete')
const fs = require('fs')

const { babel } = require('@rollup/plugin-babel')

const ReactCompilerConfig = {
  target: '18', // '17' | '18' | '19'
  sources: (filename) => {
    return filename.indexOf('src/') !== -1;
  },
};

const sortingHasher = hasher({ sort: true, coerce: true })

function generateConfig(dirname, { dev, format, folder, emitDeclaration }, options) {
  const { outputFolder, reactCompiler } = options

  return {
    input: 'index.ts', // everything needs an index.ts entrypoint
    output: [
      {
        format: format,
        // lib/development and lib/production versions
        dir: path.resolve(dirname, 'lib', folder),
        sourcemap: true,
        interop: "auto" // match typescript es module interop behaviour
      },
    ],
    plugins: [
      rpi_ast_macros({
        // include: 'code/**',
        exclude: ['node_modules/**'],

        ast_opt: {}, // passed to transform_ast(source, ast_opt)

        macros: {
          debug(...args) {
            return `debug(${args.join(', ')})`
          },
        }, // additional default macros & `this` context for macro invocation

        vm2_opt: {
          sandbox: null, // passed to VM2.NodeVM({sandbox})
          builtin: ['os', 'util', 'zlib', 'assert', 'path', 'url', 'querystring', 'punycode'], // passed to VM2.NodeVM({require:{builtin})
        },
      }),

      resolve(),
      // In dev builds, add the entropy file to cache bust the dll.
      ...(dev && !emitDeclaration
        ? [
          outputManifest({
            fileName: '../entropy.json',
            generate: (keyValueDecorator, seed, opt) => chunks =>
              chunks.reduce((manifest, data) => {
                const { name, fileName, code, imports, exports } = data

                const entropy = { name, fileName, code, imports, exports }

                return {
                  ...manifest,
                  ...keyValueDecorator(name, sortingHasher.hash(entropy), opt),
                }
              }, seed),
          }),
        ]
        : []),
      replace({
        // We defer this decision to the builder of the final bundle
        __DEV__: `process.env.NODE_ENV !== 'production'`,
        preventAssignment: true,
      }),
      autoExternal({
        builtins: true,
        dependencies: true,
        packagePath: path.resolve(dirname, 'package.json'),
        peerDependencies: true,
      }),

      commonjs(),

      // Babel plugin for react compiler, only invoked if the `reactCompiler` option is passed and truthy
      ...(
        reactCompiler ? [babel({
          extensions: [".tsx", ".ts", ".js", ".jsx"],
          plugins: [
            ['babel-plugin-react-compiler', ReactCompilerConfig],
          ],
          babelHelpers: 'inline'
        })] : []
      ),

      typescript({
        outDir: `./lib/${folder}`,

        declaration: emitDeclaration,
        module: 'esnext',
        jsx: 'react-jsx',
        ...(emitDeclaration ? { declarationDir: `./lib/${folder}/` } : {}),
      }),

      ...(emitDeclaration
        ? [
          del({
            // Delete the JS files from the types output
            // Delete test files from the types output
            targets: [`./lib/${folder}/**/*.js`, `./lib/${folder}/**/*.js.map`, `./lib/${folder}/test/**/*.d.ts`,],
            hook: 'writeBundle',
          }),
        ]
        : []),

      css({
        // Only output css on declaration pass
        output: emitDeclaration
          ? function (styles, styleNodes) {
            const cssPath = path.resolve(dirname, 'lib', `bundle.css`)

            fs.writeFileSync(cssPath, styles)
          }
          : false, // disable output on other runs
      }),

      string({
        // So far we only use this for shaders
        include: '**/*.glsl',
      }),

      ...(dev
        ? []
        : [
          terser({
            sourceMap: true,
            compress: {
              ecma: '2017',
              passes: 3,
              pure_getters: true,
              arrows: false,
              join_vars: false,
              booleans_as_integers: false,
              booleans: false,
              keep_infinity: true,
              inline: true,
            },
            mangle: {
              keep_classnames: true,
              keep_fnames: true,
            },
            format: {
              beautify: true,
              semicolons: false,
              comments: "some"
            },
          }),
        ])

      ,

      license({
        sourcemap: true,
        banner: {
          commentStyle: 'ignored',
          content: {
            file: path.join(dirname, '..', '..', 'LICENCE_TEMPLATE'),
          },
        },
      }),
      copy({
        targets: [
          {
            src: path.join(dirname, '..', '..', 'LICENCE_TEMPLATE'),
            dest: '.',
            rename: () => 'LICENCE',
          },
        ],
      }),
    ],
    // Externalise the babel runtime
    external: [/@babel\/runtime/],
  }
}

module.exports = (dirname, options) => {
  return [
    generateConfig(dirname, { dev: true, format: 'cjs', folder: 'cjs', emitDeclaration: false }, options), // dev bundle
    generateConfig(dirname, { dev: true, format: 'esm', folder: 'esm', emitDeclaration: false }, options), // dev bundle
    generateConfig(dirname, { dev: true, format: 'esm', folder: 'types', emitDeclaration: true }, options), // dev bundle
    // generateConfig(dirname, false, options), // prod bundle
  ]
}
