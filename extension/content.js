
(() => {

	const ONE_THOUSANDTH = 1 / 1000,
		ONE_SIXTIETH = 1 / 60,
		ONE_OVER_FIFTEEN_THOUSAND = 1 / 15000,
		ONE_OVER_THIRTY_THOUSAND = 1 / 30000,
		dataByPlayer = {};

	let startTime,
		prevTime,
		potentialSelfData,
		selfPlayerData,
		currentPlayerData,
		prevPlayerData = {},
		currentActionData = {},
		checkIfWithinGameInterval,
		checkIfStartedInterval,
		updateTimersInterval,

		gamePage,
		logScrollContainer,
		statusBarTicker,
		allPlayerTimers,
		currentActionTimer,
		gameEndedNotification;

	function saveContainerReferences() {
		gamePage = $('.game-page');
		logScrollContainer = $('.log-scroll-container');
		statusBarTicker = $('status-bar-ticker');
		allPlayerTimers = $('.playerTimer');
		currentActionTimer = $('.currentActionTimer');
		gameEndedNotification = $('game-ended-notification');
	}

	function convertMillisecondsToMinutesAndSeconds(ms) {
		const totalSeconds = Math.floor(ms * ONE_THOUSANDTH),
			minutes = Math.floor(totalSeconds * ONE_SIXTIETH),
			seconds = totalSeconds - (minutes * 60);

		return minutes + ':' + seconds.toString().padStart(2, '0');
	}

	function getTranslateY(element) {
		const style = window.getComputedStyle(element),
			matrix = new DOMMatrixReadOnly(style.transform);

		return matrix.m42;
	}

	function clearAllIntervals() {
		clearInterval(checkIfWithinGameInterval);
		clearInterval(checkIfStartedInterval);
		clearInterval(updateTimersInterval);
	}

	function initializeTimers() {
		clearAllIntervals();

		startTime = undefined;
		prevTime = undefined;
		potentialSelfData = { time: 0, knownSelf: null, possibilities: {} };
		selfPlayerData = undefined;
		currentPlayerData = undefined;
		prevPlayerData = {};
		currentActionData = {};

		for (const player in dataByPlayer)
			delete dataByPlayer[player];
	}

	function checkIfOnScorePage() {
		if ($('.score-page').length) {
			// If we were already on the score page, do nothing
			if ($('body').data('onScorePage') === 1) return true;
			startScorePage();
			return true;
		}
		return false;
	}

	function checkIfWithinFinishedGame() {
		if ($('.timerUi').hasClass('gameFinished')) return true;
		return false;
	}

	function checkIfGameOver() {
		// If there's a "game ended notification" on the screen...
		if (gameEndedNotification.children().length) {
			// Mark this game as finished
			$('.timerUi').addClass('gameFinished');

			// Stop updating timers
			clearInterval(updateTimersInterval);

			// Remove current action timer and any changes it has made to the UI
			updateCurrentActionTime(0);
			$('.currentActionTimer').remove();

			// Start checking if we're in a new game or elsewhere (score page)
			checkIfWithinGameInterval = setInterval(checkIfWithinGame, 500);
			return true;
		}
		return false;
	}

	function checkIfWithinGame() {
		if (checkIfOnScorePage()) return false;
		else if (checkIfWithinFinishedGame()) return false;
		else if ($('.log-container').length && $('player-info-name').length) {
			setupTimers();
			return true;
		}
		return false;
	}

	function checkIfStarted() {
		if ($('.new-turn-line').length) {
			startTimers();
			return true;
		}
		return false;
	}

	function updateCurrentActionTime(timeElapsed) {
		let { time } = currentActionData,
			fontSize,
			textOutline,
			textShadow,
			greenAndBlue = 255,
			gamePageOpacity = 1;

		time += timeElapsed;

		fontSize = 20 + (time * 0.0002);
		textOutline = 1 + (time * 0.000002);
		textShadow = 2 + (time * 0.000004);

		if (time > 15000) {
			const timeAfter15 = time - 15000;
			fontSize += timeAfter15 * 0.0005;
			textOutline += timeAfter15 * 0.000005;
			textShadow += timeAfter15 * 0.00001;

			if (time > 30000) {
				const timeAfter30 = time - 30000;
				fontSize += timeAfter30 * 0.0007;
				textOutline += timeAfter30 * 0.000007;
				textShadow += timeAfter30 * 0.000014;

				if (time > 45000) {
					const timeAfter45 = time - 45000;
					fontSize += timeAfter45 * 0.001;
					textOutline += timeAfter45 * 0.00001;
					textShadow += timeAfter45 * 0.00002;

					if (time > 60000) {
						const timeAfter60 = time - 60000;
						greenAndBlue -= Math.min((timeAfter60 * ONE_OVER_FIFTEEN_THOUSAND) * 255, 255);
						fontSize += timeAfter60 * 0.001;
						textOutline += timeAfter60 * 0.00001;
						textShadow += timeAfter60 * 0.00002;

						if (time > 75000) {
							const timeAfter75 = time - 75000;
							gamePageOpacity -= Math.min((timeAfter75 * ONE_OVER_THIRTY_THOUSAND) * 0.8, 0.8);
							fontSize += timeAfter75 * 0.001;
							textOutline += timeAfter75 * 0.00001;
							textShadow += timeAfter75 * 0.00002;
						}
					}
				}
			}
		}

		fontSize = Math.min(fontSize, 800);  // Cap font size at 800 pixels

		gamePage.css('opacity', gamePageOpacity);
		currentActionTimer
			.text(convertMillisecondsToMinutesAndSeconds(time))
			.css({
				color: 'rgb(255,' + greenAndBlue + ',' + greenAndBlue + ')',
				fontSize,
				textShadow: -textOutline + 'px ' + -textOutline + 'px ' + ' #000, ' +
							-textOutline + 'px ' + textOutline + 'px ' + ' #000, ' +
							textOutline + 'px ' + -textOutline + 'px ' + ' #000, ' +
							textShadow + 'px ' + textShadow + 'px ' + ' #000'
			});

		currentActionData.time = time;
	}

	function resetCurrenActionTimer(totalLogLines) {
		// Add an action to whoever was previously taking an action
		if (currentActionData.player)
			dataByPlayer[currentActionData.player].totalActions++;

		currentActionData.player = currentPlayerData.name; // Assign the current action to the current player
		currentActionData.time = 0;
		currentActionData.totalLogLines = totalLogLines;
	}

	function updateCurrentActionData(timeElapsed) {
		const totalLogLines = logScrollContainer.children().length;

		// If we're still on the same action, increment the current action timer and stop
		if (currentActionData.totalLogLines === totalLogLines) {
			updateCurrentActionTime(timeElapsed);
			return;
		}

		// Otherwise, reset the current action timer
		resetCurrenActionTimer(totalLogLines);
		updateCurrentActionTime(timeElapsed);
	}

	function updateCurrentPlayerData() {
		const statusBarText = statusBarTicker.text().toLowerCase();

		if (statusBarText.includes('waiting for')) {
			for (const player in dataByPlayer) {
				if (statusBarText.includes(player.toLowerCase())) {
					currentPlayerData = dataByPlayer[player];
					// If we are "waiting for" this player, it's definitely NOT ourself;
					// remove this player from possible selves
					removePlayerFromPossibleSelves(player);
				}
			}
		}
		else currentPlayerData = selfPlayerData;

		if (currentPlayerData.name !== prevPlayerData.name) {
			allPlayerTimers.removeClass('on');
			currentPlayerData.el.addClass('on');
		}

		prevPlayerData = currentPlayerData;
	}

	function useBestGuessForSelf() {
		let highestPlayerInfoY = 0;

		$('player-info').each((index, el) => {
			const y = getTranslateY(el);

			if (y > highestPlayerInfoY) {
				highestPlayerInfoY = y;

				const playerNameText = $(el).find('player-info-name').text();
				for (const player in dataByPlayer) {
					if (playerNameText.includes(player)) {
						selfPlayerData = dataByPlayer[player];
						break;
					}
				}	
			}
		});
	}

	function changeBestGuessForSelf() {
		const wronglyAssignedTime = potentialSelfData.time,
			wrongSelf = selfPlayerData.name;

		// Update selfPlayerData to the first possible player
		const { possibilities } = potentialSelfData;
		for (const player in possibilities) {
			selfPlayerData = dataByPlayer[player];
			break;
		}

		// Move all time that was added to the player we wrongly thought
		// was ourself to the player we now think is ourself
		dataByPlayer[wrongSelf].time -= wronglyAssignedTime;
		selfPlayerData.time += wronglyAssignedTime;
	}

	function removePlayerFromPossibleSelves(player) {
		if (potentialSelfData.knownSelf) return;  // If we've confirmed ourself, stop here

		const { possibilities } = potentialSelfData;
		delete possibilities[player];

		if (selfPlayerData.name === player)
			changeBestGuessForSelf();

		let totalPossibilities = 0,
			lastPossibility;

		for (const player in possibilities) {
			totalPossibilities++;
			lastPossibility = player;
		}

		if (totalPossibilities === 1) {
			potentialSelfData.knownSelf = lastPossibility;
			return;
		}
	}

	function startTimers() {
		saveContainerReferences();
		startTime = Date.now();
		prevTime = startTime;
		useBestGuessForSelf();
		updateCurrentPlayerData();

		clearInterval(checkIfStartedInterval);
		updateTimersInterval = setInterval(updateTimers, 250);

		for (const player in dataByPlayer) {
			const thisPlayerData = dataByPlayer[player];
			// If we are rebuilding timers after an undo (or another mid-game situation),
			// make sure all player timers are updated with their current player times
			thisPlayerData.timeEl.text(convertMillisecondsToMinutesAndSeconds(thisPlayerData.time));
		}

		// Scroll to bottom of log (without this, undoing leaves us scrolled to top of log)
		$('.game-log').scrollTop($('.log-scroll-container').height());
	}

	function updateTimers() {
		if (checkIfGameOver()) return;

		const currentTime = Date.now(),
			timeElapsed = currentTime - prevTime;

		currentPlayerData.time += timeElapsed;

		// If we haven't confirmed ourself yet AND it's our turn (we think!),
		// add the elapsed time to our potentialSelfData
		if (!potentialSelfData.knownSelf && currentPlayerData.name ===  selfPlayerData.name)
			potentialSelfData.time += timeElapsed;

		updateCurrentActionData(timeElapsed);
		updateCurrentPlayerData();

		const { time, totalActions } = currentPlayerData;
		currentPlayerData.timeEl.text(convertMillisecondsToMinutesAndSeconds(time));
		//currentPlayerData.totalActionsEl.text(totalActions);
		//if (totalActions) currentPlayerData.avgActionEl.text(convertMillisecondsToMinutesAndSeconds(time / totalActions));
		prevTime = currentTime;

		// If the timer UI has been removed, set up the timers again; this does NOT reset timers to 0,
		// but it rebuilds and restarts everything else
		if (!$('.timerUi').length)
			checkIfWithinGame();
	}

	function setupTimers() {
		$('body').removeData('onScorePage');
		$('.currentActionTimer').remove();
		$('.timerUi').remove();
		$('.timerStyles').remove();

		$('body').prepend(`
			<style class="timerStyles">

				.currentActionTimer {
					position:absolute;
					top:5px;
					left:0;
					color:#fff;
					font-size:20px;
					text-align:center;
					text-shadow:-1px -1px #000, -1px 1px #000, 1px -1px #000, 2px 2px #000;
					pointer-events:none;
					z-index:101;
				}

				.game-log {
					height:auto !important;
					bottom:0 !important;
				}

				.timerUi {
					color:#fff;
					padding:5px;
				}

				.playerTimer td {
					padding:2px 5px;
				}

				.playerTimer.on td {
					background-color:#555;
				}

			</style>
		`);

		const timerUi = $('<table class="timerUi"></table>'),
			currentActionTimer = $('<div class="currentActionTimer"></div>');

		$('player-info-name').each((index, el) => {
			const player = $(el).text(),
				playerTimer = $(`
					<tr class="playerTimer">
						<td class="name">${player}:</td>
						<td class="time">&mdash;</td>
						<!--
						<td>Total Actions:</td>
						<td class="totalActions">&mdash;</td>
						<td>Avg. Action Time:</td>
						<td class="avgAction">&mdash;</td>
						-->
					</tr>
				`).appendTo(timerUi);

			if (!dataByPlayer[player])
				dataByPlayer[player] = { name: player, time: 0, totalActions: 0 };

			potentialSelfData.possibilities[player] = true;

			const thisPlayerData = dataByPlayer[player];
			thisPlayerData.el = playerTimer;
			thisPlayerData.timeEl = playerTimer.find('.time');
			thisPlayerData.totalActionsEl = playerTimer.find('.totalActions');
			thisPlayerData.avgActionEl = playerTimer.find('.avgAction');
		});

		timerUi.prependTo('.log-container');
		prevPlayerData = {};

		const timerUiHeight = timerUi.height();
		$('.game-log').css('top', timerUiHeight + 12);

		const logContainerWidth = $('.log-container').width();
		currentActionTimer.css('right', logContainerWidth);
		$('.timerStyles').after(currentActionTimer);

		clearAllIntervals();
		checkIfStartedInterval = setInterval(checkIfStarted, 250);
	}

	function startScorePage() {
		$('body').data('onScorePage', 1);
		$('.currentActionTimer').remove();

		let finalTimerMessage = '';

		for (const player in dataByPlayer) {
			const time = convertMillisecondsToMinutesAndSeconds(dataByPlayer[player].time);
			finalTimerMessage += `${player} took ${time}; `;
		}

		finalTimerMessage = finalTimerMessage.slice(0, -2) + '.';
		$('.game-chat-input').val(finalTimerMessage);
		initializeTimers();
		checkIfWithinGameInterval = setInterval(checkIfWithinGame, 500);
	}

	// Initialize timers and start the first loop
	initializeTimers();
	checkIfWithinGameInterval = setInterval(checkIfWithinGame, 500);

})();
