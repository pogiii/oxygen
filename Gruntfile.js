/*
 * Copyright (C) 2015-2017 CloudBeat Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */
 
module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-sync');
    grunt.loadNpmTasks('grunt-msbuild');
    grunt.loadNpmTasks('grunt-eslint');
    
    grunt.loadTasks('./tools/grunt-tasks');

    var defaultTasks = [];
    defaultTasks.push('eslint');
    defaultTasks.push('msbuild:oxygen');
    defaultTasks.push('msbuild:xsltransform');
    defaultTasks.push('sync:main');
    
    grunt.registerTask('default', defaultTasks);

    grunt.initConfig({
        sync: {
            main: {
                files: [
                    { 
                        expand: true, 
                        cwd: 'dotnet/oxygen/bin/Debug', src: ['**', '!**/*.xml'], 
                        dest: 'lib/native' 
                    },
                    { 
                        expand: true, 
                        cwd: 'dotnet/xsltransform/bin/Debug', src: ['XSLTransform.exe'], 
                        dest: 'lib/reporters/html' 
                    }
                ], 
                verbose: true
            },
        },
        eslint: {
            target: ['Gruntfile.js', 'lib/**/*.js', 'errors/**/*.js', 'model/**/*.js', 'ox_modules/**/*.js'],
            options: {
                configFile: 'tools/.eslintrc.json'
            },
        },
        msbuild: {
            oxygen: {
                src: ['dotnet/oxygen/Oxygen.csproj'],
                options: {
                    projectConfiguration: 'Debug',
                    targets: ['Rebuild'],
                    version: 12.0,
                    maxCpuCount: 4,
                    buildParameters: {
                        WarningLevel: 2
                    },
                    verbosity: 'minimal'
                }
            },
            xsltransform: {
                src: ['dotnet/xsltransform/XSLTransform.csproj'],
                options: {
                    projectConfiguration: 'Debug',
                    targets: ['Rebuild'],
                    version: 12.0,
                    maxCpuCount: 4,
                    buildParameters: {
                        WarningLevel: 2
                    },
                    verbosity: 'minimal'
                }
            }
        },
        dos2unix: {
            file: 'lib/cli.js'
        },
        unix2dos: {
            file: 'lib/cli.js'
        }
    });
};
