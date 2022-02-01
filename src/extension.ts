import * as vscode from 'vscode';
import { chromium, ChromiumBrowser } from 'playwright-core';
import Translator from './translator';

let browser: ChromiumBrowser;
let isRunning: boolean = false;
let translators : Translator[] = [];

export function activate(context: vscode.ExtensionContext) {
  
	let disposable = vscode.commands.registerCommand('translon.start', () => {
    try {
      let activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        vscode.window.withProgress({location: vscode.ProgressLocation.Window, title: 'Translon:'},
          async progress => {
            progress.report({ message: 'Launching Browser...' });
            //Launch Browser If It Wasn't Launched
            if (!isRunning) {
              browser = await chromium.launch({
                headless: vscode.workspace.getConfiguration('translon').get<boolean>('useHeadlessBrowser'),
                channel: vscode.workspace.getConfiguration('translon').get('browserDistributionChannel'),
              });
              isRunning = true;
              //Turn Off 'isRunning' Flag When Browser Was Closed
              browser.on('disconnected', () => {isRunning = false;});
            }
            //Create Translator Instance
            const reportProgress = (message: string) => {
              progress.report({ message: message, increment: 0 });
            };
            const closeListener = (uuid: string) => {
              translators = translators.filter(t => t.uuid !== uuid);
              //Close Browser When There Are No Instances
              if (translators.length === 0) {
                browser.close();
              }
            };
            if (activeEditor) {
              const translator =  await new Translator('deepl').setup(context, browser, activeEditor, reportProgress, closeListener);
              translators.push(translator);
            } else {
              //Editor Was Closed While Loading Translator
              vscode.window.showErrorMessage('No active editor found');
            }
            console.log(translators.length);
          }
        );
      }else {
        vscode.window.showErrorMessage('No active editor found');
      }
    } catch(err) {
      console.error(err);
      vscode.window.showErrorMessage('Failed to launch browser');
    }
	});
  context.subscriptions.push(disposable);
}

export function deactivate() {
  browser.close();
}