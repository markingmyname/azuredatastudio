/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the Source EULA. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as TypeMoq from 'typemoq';
import * as azdata from '../azdata';
import * as sinon from 'sinon';
import * as childProcess from '../common/childProcess';
import * as should from 'should';
import * as utils from '../common/utils';
import * as nock from 'nock';

describe('azdata', function () {

	let outputChannelMock: TypeMoq.IMock<vscode.OutputChannel>;
	beforeEach(function (): void {
		outputChannelMock = TypeMoq.Mock.ofType<vscode.OutputChannel>();

	});
	afterEach(function (): void {
		sinon.restore();
		nock.cleanAll();
		nock.enableNetConnect();
	});

	describe('findAzdata', function () {
		it('successful', async function (): Promise<void> {
			if (process.platform === 'win32') {
				// Mock searchForCmd to return a path to azdata.cmd
				sinon.stub(utils, 'searchForCmd').returns(Promise.resolve('C:\\path\\to\\azdata.cmd'));
			}
			// Mock call to --version to simulate azdata being installed
			sinon.stub(childProcess, 'executeCommand').returns(Promise.resolve({ stdout: 'v1.0.0', stderr: '' }));
			await should(azdata.findAzdata(outputChannelMock.object)).not.be.rejected();
		});
		it('unsuccessful', async function (): Promise<void> {
			if (process.platform === 'win32') {
				// Mock searchForCmd to return a failure to find azdata.cmd
				sinon.stub(utils, 'searchForCmd').returns(Promise.reject(new Error('Could not find azdata')));
			} else {
				// Mock call to executeCommand to simulate azdata --version returning error
				sinon.stub(childProcess, 'executeCommand').returns(Promise.reject({ stdout: '', stderr: 'command not found: azdata' }));
			}
			await should(azdata.findAzdata(outputChannelMock.object)).be.rejected();
		});
	});

	// TODO: Install not implemented on linux yet
	describe('downloadAndInstallAzdata', function (): void {
		it('successful download & install', async function (): Promise<void> {
			sinon.stub(childProcess, 'executeCommand').returns(Promise.resolve({ stdout: '', stderr: '' }));
			if (process.platform === 'linux') {
				sinon.stub(childProcess, 'executeSudoCommand').returns(Promise.resolve({ stdout: '', stderr: '' }));
			}
			nock(azdata.azdataHostname)
				.get(`/${azdata.azdataUri}`)
				.replyWithFile(200, __filename);
			const downloadPromise = azdata.downloadAndInstallAzdata(outputChannelMock.object);
			await downloadPromise;
		});

		it('errors on unsuccessful download', async function (): Promise<void> {
			nock('https://aka.ms')
				.get('/azdata-msi')
				.reply(404);
			const downloadPromise = azdata.downloadAndInstallAzdata(outputChannelMock.object);
			await should(downloadPromise).be.rejected();
		});
	});
});
