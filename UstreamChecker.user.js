// ==UserScript==
// @name        UstreamChecker
// @namespace   a
// @description UstreamChecker
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @include     http://revinx.net/ustream/
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @run-attr	document-idle
// @version     0.1.0
// ==/UserScript==

/////////////////////////////
// idea
/////////////////////////////

// 1次2次結合
// 1次配信を2次へ移動
// トピックの文章が同じ場合省略
// リンクをチェッカーページに固定
// 特定の配信サイトを非表示
// トピック内のキーワードで非表示

/////////////////////////////
// 定数
/////////////////////////////

// データベース用の名前
const DISABLE_LIST_DB_NAME = 'disable_list';
const DISABLE_SECTION_DB_NAME = 'disable_section';
const FAVORITE_LIST_DB_NAME = 'favorite_list';
const TABLE_ORDER_DB_NAME = 'table_order';

// 非表示セクションDB用の名前
const FIRST_LIST_SECTION_DB_NAME = '1st_list_section';
const SECOND_LIST_SECTION_DB_NAME = '2nd_list_section';
const OTHER_SECTION_DB_NAME = 'other_section';
const EVENT_TICKER_DB_NAME = 'event_ticker';

// お気に入りマーク用の色
const UNFAVORITE_MARK_COLOR = 'rgb(128, 128, 128)';
const FAVORITE_MARK_COLOR = 'rgb(255, 140, 0)';
const FAVORITE_ROW_COLOR = 'rgb(255, 246, 202)';
const UNDISABLE_MARK_COLOR = 'rgb(128, 128, 128)';
const DISABLE_MARK_COLOR = 'rgb(255, 0, 0)';

// テーブル並び替え用の名前
const DEFAULT_ORDER_NAME = 'default';
const ALPHABETICAL_ORDER_NAME = 'alphabetical';
const START_TIME_ORDER_NAME = 'startTime';
const ID_ORDER_NAME = 'id';

/////////////////////////////
// 変数
/////////////////////////////

let disableList = null;
let disableSection = null;
let FavoriteList = null;
let TableOrder = null;

$(window).ready(function () {
	/////////////////////////////
	// ボタンの追加
	/////////////////////////////

	// お気に入りボタンの追加
	let buttonContent = '<a class="favoriteMark" title="お気に入り">★</a>';
	// 非表示ボタンの追加
	buttonContent += '<a class="disableButton" title="非表示">×</a>';
	$('td.name > a').after(buttonContent);

	// デバッグボタン
	// $('div#topMenuBar ul li:first-child').prepend('<input type="button" class="debug_button" value="デバッグ" />');

	// その他の情報開閉トグルボタン
	$('.noblk').last().before('<br><input type="button" id="otherToggleButton" value="その他の情報を格納" />');
	// その他の情報をまとめる
	$('#otherToggleButton').nextAll().wrapAll('<div id="otherToggle" />');

	/////////////////////////////
	// ボタン用CSS
	/////////////////////////////
	GM_addStyle('.favoriteMark, .disableButton, .favoritedMark {cursor: pointer; margin: 2px; font-weight: bold;}' +
		' .favoriteMark {color:' + UNFAVORITE_MARK_COLOR + '}' +
		' .disableButton {color: ' + UNDISABLE_MARK_COLOR + '}' +
		' .favoritedMark {color:' + FAVORITE_MARK_COLOR + ';}' +
		' .favoriteMark:hover, .disableButton:hover, .favoritedMark:hover {font-size: 30px;}' +
		' .favoriteMark:hover {color:' + FAVORITE_MARK_COLOR + ' !important;}' +
		' .disableButton:hover {color:' + DISABLE_MARK_COLOR + ' !important;}' +
		' .favoritedMark:hover {color:' + UNFAVORITE_MARK_COLOR + ' !important;}'
	);

	/////////////////////////////
	// お気に入り用CSS
	/////////////////////////////

	GM_addStyle('tr.favorite > td {background-color: ' + FAVORITE_ROW_COLOR + ' !important;}');

	/////////////////////////////
	// モーダルウィンドウ
	/////////////////////////////

	// モーダルウィンドウボタン
	$('#topMenuBar > ul').append('<li><a data-target="wm" class="modal-open" style="cursor: pointer;">拡張スクリプト設定</a></li>');

	// モーダルウィンドウ本体
	$('body').append('<div id="mw" class="modal-content"></div>');
	let mw = $('div.modal-content');

	// タイトル
	let mwContent = '<h2>拡張スクリプト設定</h2>';
	// お気に入りリスト
	mwContent += '<div class="modal-item"><h3>お気に入りリスト</h3><textarea value="" id="favoriteListText" rows="5" wrap="hard" style="width:100%; max-width:100%; min-width:100%;" /><input type="button" class="button" id="favoriteListSaveButton" value="保存"><input type="button" class="button" id="favoriteListInitializeButton" value="初期化"></div>';
	// 非表示リスト
	mwContent += '<div class="modal-item"><h3>非表示リスト</h3><textarea value="" id="disableListText" rows="5" wrap="hard" style="width:100%; max-width:100%; min-width:100%;" /><input type="button" class="button" id="disableListSaveButton" value="保存"><input type="button" class="button" id="disableListInitializeButton" value="初期化"></div>';
	// 非表示セクション
	mwContent += '<div class="modal-item"><h3>部分非表示(チェックすると非表示)</h3><div class="modal-item"><input type="checkbox" class="disableSectionCheckbox" id="1st_list_section"><label for="1st_list_section">1次チェッカー</label><input type="checkbox" class="disableSectionCheckbox" id="2nd_list_section"><label for="2nd_list_section">2次チェッカー</label><input type="checkbox" class="disableSectionCheckbox" id="other_section"><label for="other_section">その他の情報</label></div><div class="modal-item"><input type="checkbox" class="disableSectionCheckbox" id="event_ticker"><label for="event_ticker">イベントティッカー</label></div><input type="button" class="button" id="disableSectionInitializeButton" value="初期化"></div>';
	// ソート
	mwContent += '<div class="modal-item"><h3>ソート順</h3><input type="radio" class="orderRadio" id="defaultOrderRadio" name="orderRadio"><label for="defaultOrderRadio">デフォルト(視聴者人数順)</label><input type="radio" class="orderRadio" id="alphabeticalOrderRadio" name="orderRadio"><label for="alphabeticalOrderRadio">配信者名のあいうえお順</label><input type="radio" class="orderRadio" id="startTimeOrderRadio" name="orderRadio"><label for="startTimeOrderRadio">配信開始時間順</label><input type="radio" class="orderRadio" id="idOrderRadio" name="orderRadio"><label for="idOrderRadio">登録番号順</label></div>';

	// 閉じるボタン
	mwContent += '<input type="button" class="button" id="modal-close" value="閉じる" />';
	mw.append(mwContent);

	/////////////////////////////
	// モーダルウィンドウ用CSS
	/////////////////////////////

	// modal-window用CSS
	GM_addStyle('.modal-content {position: absolute; overflow: auto; display: none; z-index: 100; width: 75%; margin: 0; padding: 10px 20px; border: 2px solid #aaa; background: #fff;}' +
		'.modal-item {border: medium solid #CCC; padding: 10px; border-radius: 10px; margin: 10px;}');

	// modal-overlay用CSS
	GM_addStyle('.modal-overlay {z-index: 99; display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75);}');

	// ボタン用CSS
	GM_addStyle('.button {width: 100px; margin: 2px; position: relative; background-color: #1abc9c; border-radius: 8px; color: #fff; line-height: 28px; -webkit-transition: none; transition: none; box-shadow: 0 3px 0 #0e8c73; text-shadow: 0 1px 1px rgba(0, 0, 0, .3);}' +
		'.button:hover {background-color: #52bca7; box-shadow: 0 3px 0 #23a188;}' +
		'.button:active {top: 3px; box-shadow: none;}');

	/////////////////////////////
	// 設定の反映
	/////////////////////////////

	// 非表示セクションの反映
	$(function () {
		let ds = getDisableSection();

		if (ds[FIRST_LIST_SECTION_DB_NAME]) {
			toggleSection(FIRST_LIST_SECTION_DB_NAME);
		}
		if (ds[SECOND_LIST_SECTION_DB_NAME]) {
			toggleSection(SECOND_LIST_SECTION_DB_NAME);
		}
		if (ds[OTHER_SECTION_DB_NAME]) {
			toggleSection(OTHER_SECTION_DB_NAME);
		}
		if (ds[EVENT_TICKER_DB_NAME]) {
			toggleSection(EVENT_TICKER_DB_NAME);
		}
	});

	// 非表示リストの反映
	$('td.name > a[href]').each(function () {
		let text = $(this).text().replace(/\r?\n/g, '');
		let list = getDisableList();
		if ($.inArray(text, list) != -1) {
			deleteRow(this);
		}
		//console.log(this);
	});

	// お気に入りリストの反映
	$('.favoriteMark').each(function () {
		let button = nameFromFavoriteButton(this);
		let list = getFavoriteList();
		if ($.inArray(button, list) >= 0) {
			// ★の色変更
			$(this).removeClass('favoriteMark').addClass('favoritedMark');
			moveFavoriteRow($(this).parent().parent());
		}
	});

	// テーブルソートの反映
	$(function () {
		switch (getTableOrder()) {
			case DEFAULT_ORDER_NAME:
				$('#defaultOrderRadio').prop('checked', true);
				break;
			case ALPHABETICAL_ORDER_NAME:
				$('#alphabeticalOrderRadio').prop('checked', true);
				reorderAlphabetical();
				break;
			case START_TIME_ORDER_NAME:
				$('#startTimeOrderRadio').prop('checked', true);
				reorderStartTime();
				break;
			case ID_ORDER_NAME:
				$('#idOrderRadio').prop('checked', true);
				reorderId();
				break;
		}
	});

	/////////////////////////////
	// そのほかの編集
	/////////////////////////////

	// サムネイル表示を変更
	$('.popup').each(function () {
		let a = $(this).find('a');
		$(a).find('img').eq(1).attr('onmouseover', 'this.src=\'' + $(a).find('img').eq(0).attr('src') + '\'');
		$(a).find('img').eq(1).attr('onmouseout', 'this.src=\'' + $(a).find('img').eq(1).attr('src') + '\'');
		$(a).find('img.r').remove();
		$(a).appendTo($(this).parent('td.status'));
		$(this).remove();
	});

	// トピックを改行して表示
	$('td.topic > img+img').before(function () {
		$(this).before('<br>');
	});

	// 省略されているトピックを復活
	$('p.arrow_box').each(function () {
		// 省略されていないトピックを取得
		let topic = $(this).html().replace(/^<br>/g, '').replace(/<br>$/g, '');
		// 反映
		$(this).parent().html(topic);
	});

	// イベントバーを移動
	$('.ticker').insertBefore('.noblk:first');

	/////////////////////////////
	// ボタンイベント
	/////////////////////////////

	// 非表示ボタン
	$('.disableButton').on('click', function () {
		if (confirm('[' + nameFromDisableButton($(this)) + ']を非表示にしますか？')) {
			// OK
			addDisableList(nameFromDisableButton($(this)));
			deleteRow(this);
		} else {
			// cancel
			//console.log('canceled add disable list');
		}
	});

	// お気に入りボタン
	$(document).on('click', '.favoriteMark', function () {
		// リストにない
		addFavoriteList(nameFromFavoriteButton(this));
		$(this).removeClass('favoriteMark').addClass('favoritedMark');
		// お気に入りへ移動
		moveFavoriteRow($(this).parent().parent());
	});
	// お気に入り解除ボタン
	$(document).on('click', '.favoritedMark', function () {
		let index = $.inArray(nameFromFavoriteButton(this), getFavoriteList());
		// リストから削除
		removeFavoriteList(index);
		// マーク変更
		$(this).removeClass('favoritedMark').addClass('favoriteMark');
		// お気に入り外へ移動
		removeFavoriteRow($(this).parent().parent());
	});

	// その他欄の非表示トグルボタン
	$('#otherToggleButton').on('click', function () {
		toggleSection(OTHER_SECTION_DB_NAME);
	});

	/////////////////////////////
	// 設定ウィンドウ
	/////////////////////////////

	// 「.modal-open」をクリック
	$('.modal-open').on('click', function () {
		// オーバーレイ用の要素を追加
		$('body').append('<div class="modal-overlay"></div>');
		// モーダルコンテンツのIDを取得
		let modal = $('#mw');
		let modalOverlay = $('.modal-overlay');
		// オーバーレイをフェードイン
		modalOverlay.fadeIn('slow');
		// モーダルコンテンツの表示位置を設定
		modalResize();
		// モーダルコンテンツフェードイン
		modal.fadeIn('slow');

		/////////////////////////////
		// 設定ウィンドウに設定内容を表示
		/////////////////////////////

		// 非表示リストを表示
		$('#disableListText').val(getDisableList());
		// 非表示セクションを反映
		$('.disableSectionCheckbox').each(function () {
			let key = $(this).attr('id');
			let ds = getDisableSection();

			if (ds[key]) {
				// チェックあり
				$(this).prop('checked', true);
			} else {
				// チェックなし
				$(this).prop('checked', false);
			}
		});
		// お気に入りリストを表示
		$('#favoriteListText').val(getFavoriteList());
		// テーブル並び替え順を表示
		$(function () {
			switch (getTimeAfterStarting()) {
				case DEFAULT_ORDER_NAME:
					$('#defaultOrderRadio').prop('checked', true);
					break;
				case ALPHABETICAL_ORDER_NAME:
					$('#alphabeticalOrderRadio').prop('checked', true);
					break;
				case START_TIME_ORDER_NAME:
					$('#startTimeOrderRadio').prop('checked', true);
					break;
				case ID_ORDER_NAME:
					$('#idOrderRadio').prop('checked', true);
					break;
			}
		});

		/////////////////////////////
		// 設定ウィンドウ内の初期化ボタン
		/////////////////////////////

		// 非表示リストを初期化ボタン
		$('#disableListInitializeButton').on('click', function () {
			initializeDisableListDB();
			$('disableListText').val(getDisableList());
		});
		// お気に入りリストを初期化
		$('#favoriteListInitializeButton').on('click', function () {
			initializeFavoriteListDB();
			$('#favoriteListText').val(getFavoriteList());
		});
		// 非表示セクションリストを初期化
		$('#disableSectionInitializeButton').on('click', function () {
			initializeDisableSectionDB();
			$('.disableSectionCheckbox').each(function () {
				let key = $(this).attr('id');
				let ds = getDisableSection();

				if (ds[key]) {
					// チェックあり
					$(this).prop('checked', true);
				} else {
					// チェックなし
					$(this).prop('checked', false);
				}
			});
		});

		/////////////////////////////
		// 設定ウィンドウ内の保存ボタン
		/////////////////////////////

		// 非表示リストを保存ボタン
		$('#disableListSaveButton').on('click', function () {
			if (confirm('非表示リストを保存しますか？')) {
				// OK
				let dlist = $('#disableListText').val().split(',');
				setDisableList(dlist);
			}
		});
		// 非表示セクションのチェックボックス
		$('.disableSectionCheckbox').on('change', function () {
			let id = $(this).attr('id');

			if ($(this).is(':checked')) {
				// チェックしたら
				setDisableSection(id, true);
			} else {
				// チェックはずれたら
				setDisableSection(id, false);
			}
		});
		// お気に入りリストを保存ボタン
		$('#favoriteListSaveButton').on('click', function () {
			if (confirm('お気に入りリストを保存しますか？')) {
				// OK
				let flist = $('#favoriteListText').val().split(',');
				setFavoriteList(flist);
			}
		});
		// テーブル並び替え切り替え
		$('.orderRadio').on('change', function () {
			let id = $(this).attr('id');

			switch (id) {
				case 'defaultOrderRadio':
					setTableOrder(DEFAULT_ORDER_NAME);
					reorderDefault();
					break;
				case 'alphabeticalOrderRadio':
					setTableOrder(ALPHABETICAL_ORDER_NAME);
					reorderAlphabetical();
					break;
				case 'startTimeOrderRadio':
					setTableOrder(START_TIME_ORDER_NAME);
					reorderStartTime();
					break;
				case 'idOrderRadio':
					setTableOrder(ID_ORDER_NAME);
					reorderId();
					break;

			}
		});

		// 「.modal-overlay」あるいは「.modal-close」をクリック
		$('.modal-overlay, #modal-close').off().on('click', function () {
			// モーダルコンテンツとオーバーレイをフェードアウト
			modal.fadeOut('slow');
			modalOverlay.fadeOut('slow', function () {
				// オーバーレイを削除
				modalOverlay.remove();
			});
		});

		// リサイズしたら表示位置を再取得
		$(window).on('resize', function () {
			modalResize();
		});

		/**
		 * モーダルコンテンツの表示位置を設定する関数
		 */
		function modalResize() {
			// モーダルコンテンツの表示位置を取得
			let x = ($(window).width() - modal.outerWidth(true)) / 2;
			let y = 50; //($(window).height() - modal.outerHeight(true)) / 2;

			// モーダルコンテンツの表示位置を設定
			modal.css({
				'left': x + 'px', 'top': y + 'px',
			});
		}
	});
});

/////////////////////////////
// 非表示リスト
/////////////////////////////

/**
 * 非表示リストを初期化
 */
function initializeDisableListDB() {
	if (confirm('非表示リストを初期化しますか？')) {
		GM_setValue(DISABLE_LIST_DB_NAME, []);
		disableList = GM_getValue(DISABLE_LIST_DB_NAME);
		//console.log(DISABLE_LIST_DB_NAME + ' initialize');
	} else {
		//console.log(DISABLE_LIST_DB_NAME + ' initialize canceled');
	}
}

/**
 * 非表示リストの読み込み
 * @return {Array.<string>}
 */
function getDisableList() {
	if (disableList == null) {
		if (GM_getValue(DISABLE_LIST_DB_NAME) == undefined) {
			initializeDisableListDB();
		}

		disableList = GM_getValue(DISABLE_LIST_DB_NAME);
	}

	return disableList;
}

/**
 * 非表示リストの反映
 * @param {Array.<string>} list 非表示リスト
 */
function setDisableList(list) {
	GM_setValue(DISABLE_LIST_DB_NAME, list);
	//console.log('save ' + DISABLE_LIST_DB_NAME);
}

/**
 * 非表示リストの追加
 * @param {string} name 配信者名
 */
function addDisableList(name) {
	disableList.push(name);

	setDisableList(disableList);
}

/////////////////////////////
// セクション非表示
/////////////////////////////

/**
 * 非表示セクションデータベースを初期化
 */
function initializeDisableSectionDB() {
	if (confirm('非表示リストを初期化しますか？')) {
		let dsInitial = {
			FIRST_LIST_SECTION_DB_NAME: false,
			SECOND_LIST_SECTION_DB_NAME: false,
			OTHER_SECTION_DB_NAME: true,
			EVENT_TICKER_DB_NAME: false,
		};

		GM_setValue(DISABLE_SECTION_DB_NAME, dsInitial);
		disableSection = GM_getValue(DISABLE_SECTION_DB_NAME);
		//console.log(DISABLE_SECTION_DB_NAME + ' initialize');
	} else {
		//console.log(DISABLE_SECTION_DB_NAME + ' initialize canceled');
	}
}

/**
 * 非表示セクションの読み込み
 * @return {Array.<string,boolean>} 非表示セクション
 */
function getDisableSection() {
	if (disableSection == null) {
		if (GM_getValue(DISABLE_SECTION_DB_NAME) == undefined) {
			initializeDisableSectionDB();
		}

		disableSection = GM_getValue(DISABLE_SECTION_DB_NAME);
	}

	return disableSection;
}

/**
 * 非表示セクションを保存
 * @param {string} section セクション名
 * @param {boolean} bool trueで非表示
 */
function setDisableSection(section, bool) {
	let firstListSection = $('.noblk').first();
	let secondListSection = $('.noblk').eq(1);
	let otherSection = $('#otherToggle');
	let otherToggleButton = $('#otherToggleButton');
	let eventTicker = $('.ticker');

	let ds = getDisableSection();
	ds[section] = bool;

	switch (section) {
		case FIRST_LIST_SECTION_DB_NAME:
			firstListSection.slideToggle(!bool);
			break;
		case SECOND_LIST_SECTION_DB_NAME:
			secondListSection.slideToggle(!bool);
			break;
		case OTHER_SECTION_DB_NAME:
			otherSection.slideToggle(!bool);
			// ボタンテキストを変更
			otherToggleButton.val((otherToggleButton.val() == 'その他の情報を展開') ? 'その他の情報を格納' : 'その他の情報を展開');
			break;
		case EVENT_TICKER_DB_NAME:
			eventTicker.slideToggle(!bool);
			break;
	}

	GM_setValue(DISABLE_SECTION_DB_NAME, ds);
}

/**
 * セクションの表示を切り替え
 * @param {string} section セクション名
 */
function toggleSection(section) {
	let firstListSection = $('.noblk').first();
	let secondListSection = $('.noblk').eq(1);
	let otherSection = $('#otherToggle');
	let otherToggleButton = $('#otherToggleButton');
	let eventTicker = $('.ticker');

	switch (section) {
		case FIRST_LIST_SECTION_DB_NAME:
			firstListSection.slideToggle();
			break;
		case SECOND_LIST_SECTION_DB_NAME:
			secondListSection.slideToggle();
			break;
		case OTHER_SECTION_DB_NAME:
			otherSection.slideToggle();
			// ボタンテキストを変更
			otherToggleButton.val((otherToggleButton.val() == 'その他の情報を展開') ? 'その他の情報を格納' : 'その他の情報を展開');
			break;
		case EVENT_TICKER_DB_NAME:
			eventTicker.slideToggle();
			break;
	}
}

/////////////////////////////
// お気に入り
/////////////////////////////

/**
 * お気に入りリストを初期化
 */
function initializeFavoriteListDB() {
	if (confirm('お気に入りリストを初期化しますか？')) {
		GM_setValue(FAVORITE_LIST_DB_NAME, []);
		FavoriteList = GM_getValue(FAVORITE_LIST_DB_NAME);
		//console.log(FAVORITE_LIST_DB_NAME + ' initialize');
	}
}

/**
 * お気に入りリストの取得
 * @return {Array.<string>} お気に入りリスト
 */
function getFavoriteList() {
	if (FavoriteList == null) {
		if (GM_getValue(FAVORITE_LIST_DB_NAME) == undefined) {
			initializeFavoriteListDB();
		}

		FavoriteList = GM_getValue(FAVORITE_LIST_DB_NAME);
	}

	return FavoriteList;
}

/**
 * お気に入りリストを保存
 * @param {Array.<string>} list お気に入りリスト
 */
function setFavoriteList(list) {
	GM_setValue(FAVORITE_LIST_DB_NAME, list);
	//console.log('save ' + FAVORITE_LIST_DB_NAME);
}

/**
 * お気に入りリストへ追加
 * @param {string} name 配信者名
 */
function addFavoriteList(name) {
	FavoriteList.push(name);
	setFavoriteList(FavoriteList);
}

/**
 * お気に入りリストから一つ削除
 * @param {number} index インデックス
 */
function removeFavoriteList(index) {
	let list = getFavoriteList();
	list.splice(index, 1);

	setFavoriteList(list);
}

/**
 * お気に入りした行を移動
 * @param {Object} row 行のオブジェクト
 */
function moveFavoriteRow(row) {
	// 2次から1次へ変換
	if ($(row).parents('table').attr('id') == 'secondList') {
		// 経過時間と開始時間を結合
		let dur = $(row).find('span.duration').prop('outerHTML');
		let date = $(row).find('span.date').prop('outerHTML');
		// 配信サイトの画像を変更
		$(row).find('td.status a > img').attr('src', function () {
			return $(this).attr('src').replace(/_s/g, '');
		});
		// 視聴者数
		$(row).find('.viewers').html(
			'<span class="viewersNum">' + $(row).find('.viewers').text() + '</span>'
		);

		// 適用
		$(row).find('td.lastDate').html(dur + '<br>' + date);
		$(row).find('td.duration').remove();
	}
	// 移動
	$(row).removeClass('invisible').addClass('favorite').insertBefore($('#firstList tr').not('.favorite').eq(1));
	// クラスが空のときofflineを追加
	if ($(row).hasClass('favorite') && !$(row).hasClass('online')) {
		$(row).addClass('offline');
	}
	// 終了してからの時間を表示
	if ($(row).hasClass('offline')) {
		let duration = '<span class="duration">' +
			getTimeSinceEnd($(row).find('td.lastDate > span.date').text()) +
			'</span>';
		$(row).find('td.lastDate > span.date').before(duration + '<br>');
	}
}

/**
 * お気に入り行から削除
 * @param {Object} row 行のオブジェクト
 */
function removeFavoriteRow(row) {
	// 移動
	$(row).removeClass('favorite').insertBefore($('#firstList tr.offline').first());
	// クラスが空のときinvisibleを追加
	if (!$(row).hasClass('online') && !$(row).hasClass('offline')) {
		$(row).addClass('invisible');
	}
}

/**
 * 日時から現在までの時間を取得
 * @param {string} date 時間
 * @return {string} 時間
 */
function getTimeSinceEnd(date) {
	// 現在時刻
	let now = new Date();
	// 先頭の波を削除
	date = date.replace(/^～/, '');
	// 文字列から時間(秒)に変換
	let time = (now.getTime() - new Date(now.getFullYear(),
		('0' + date.match(/\d+/)).slice(-2) - 1,
		('0' + date.match(/\d+(?=\s)/)).slice(-2),
		date.match(/\d+(?=:)/),
		date.match(/\d+$/),
		0)) / 1000;
	// ミリ秒から時間へ変換
	if (time / 60 < 60) {
		// 60分以内
		return '～' + Math.round(time / 60) + '分前';
	} else if (time / 3600 < 24) {
		// 24時間以内
		return '～' + Math.round(time / 3600) + '時間前';
	} else if (time / 86400 < 360) {
		// 360日以内
		return '～' + Math.round(time / 86400) + '日前';
	} else {
		// 1年以上
		return '～' + Math.round(time / 31104000) + '年前';
	}
}

/////////////////////////////
// 並び替え
/////////////////////////////

/**
 * テーブル並び替え設定を初期化
 */
function initializeTableOrderDB() {
	if (confirm('並び替えを初期化しますか？')) {
		GM_setValue(TABLE_ORDER_DB_NAME, DEFAULT_ORDER_NAME);
		TableOrder = GM_getValue(TABLE_ORDER_DB_NAME);
		//console.log(TABLE_ORDER_DB_NAME + ' initialize');
	}
}

/**
 * テーブル並び替え設定を取得
 * @return {string} テーブル並び替え設定
 */
function getTableOrder() {
	if (TableOrder == null) {
		if (GM_getValue(TABLE_ORDER_DB_NAME) == undefined) {
			initializeTableOrderDB();
		}

		TableOrder = GM_getValue(TABLE_ORDER_DB_NAME);
	}

	return TableOrder;
}

/**
 * テーブル並び替え設定を設定
 * @param {string} order テーブル並び替え設定
 */
function setTableOrder(order) {
	TableOrder = order;
	GM_setValue(TABLE_ORDER_DB_NAME, TableOrder);
}

/**
 * テーブル並び替えをデフォルトにする
 */
function reorderDefault() {
	// デフォルト
	//console.log('def');
	if (confirm('ページを更新します')) {
		location.reload();
	}
}

/**
 * テーブル並び替えあいうえお順にする
 */
function reorderAlphabetical() {
	// ヘッダ
	let header = $('#firstList tr').eq(0).prop('outerHTML');

	// お気に入り
	let favoriteOffline = getOuterHTML($('#firstList tr.favorite'));
	let favoriteOnline = getOuterHTML($('#firstList tr.favorite.online'));
	favoriteOnline = $(favoriteOnline).sort(function (a, b) {
		return $(a).find('td.name > a[href]').text() < $(b).find('td.name > a[href]').text() ? -1 : 1;
	});
	let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

	// オンライン
	let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
	online = $(online).sort(function (a, b) {
		return $(a).find('td.name > a[href]').text() < $(b).find('td.name > a[href]').text() ? -1 : 1;
	});
	online = getOuterHTML($(online));

	// オフライン
	let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

	// 非表示
	let invisible = getOuterHTML($('#firstList tr.invisible'));

	// 2次
	let second = getOuterHTML($('#secondList tr.online'));
	second = $(second).sort(function (a, b) {
		return $(a).find('td.name > a[href]').text() < $(b).find('td.name > a[href]').text() ? -1 : 1;
	});
	second = getOuterHTML($(second));

	// 適用
	$('#firstList tbody').html(header + favorite + online + offline + invisible);
	$('#secondList tbody').html(second);
	//console.log('alp');
}

/**
 * テーブル並び替えを開始時間順にする
 */
function reorderStartTime() {
	// ヘッダ
	let header = $('#firstList tr').eq(0).prop('outerHTML');

	// お気に入り
	let favoriteOffline = getOuterHTML($('#firstList tr.favorite.offline'));
	let favoriteOnline = getOuterHTML($('#firstList tr.favorite.online'));
	favoriteOnline = $(favoriteOnline).sort(function (a, b) {
		return getTimeAfterStarting($(a).find('span.date').text()) > getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
	});
	let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

	//オンライン
	let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
	online = $(online).sort(function (a, b) {
		return getTimeAfterStarting($(a).find('span.date').text()) > getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
	});
	online = getOuterHTML($(online));

	// オフライン
	let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

	// 非表示
	let invisible = getOuterHTML($('#firstList tr.invisible'));

	// 2次
	let second = getOuterHTML($('#secondList tr.online'));
	second = $(second).sort(function (a, b) {
		return getTimeAfterStarting($(a).find('span.date').text()) > getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
	});
	second = getOuterHTML($(second));

	// 適用
	$('#firstList tbody').html(header + favorite + online + offline + invisible);
	$('#secondList tbody').html(second);
	//console.log('sta');
}

/**
 * テーブル並び替えを登録番号順にする
 */
function reorderId() {
	// ヘッダ
	let header = $('#firstList tr').eq(0).prop('outerHTML');

	// お気に入り
	let favoriteOffline = getOuterHTML($('#firstList tr.favorite.offline'));
	let favoriteOnline = getOuterHTML($('#firstList tr.favorite.online'));
	favoriteOnline = $(favoriteOnline).sort(function (a, b) {
		return getTimeAfterStarting($(a).find('span.date').text()) < getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
	});
	let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

	//オンライン
	let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
	online = $(online).sort(function (a, b) {
		return Number($(a).find('td.log > a').attr('href').slice(14)) < Number($(b).find('td.log > a').attr('href').slice(14)) ? -1 : 1;
	});
	online = getOuterHTML($(online));

	// オフライン
	let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

	// 非表示
	let invisible = getOuterHTML($('#firstList tr.invisible'));

	// 2次
	let second = getOuterHTML($('#secondList tr.online'));
	second = $(second).sort(function (a, b) {
		return Number($(a).find('td.log > a').attr('href').slice(14)) < Number($(b).find('td.log > a').attr('href').slice(14)) ? -1 : 1;
	});
	second = getOuterHTML($(second));

	// 適用
	$('#firstList tbody').html(header + favorite + online + offline + invisible);
	$('#secondList tbody').html(second);
	//console.log('id');
}

/**
 * テーブルの行をまとめる
 * @param {Object} obj まとめる行のオブジェクト
 * @return {string} まとめた行
 */
function getOuterHTML(obj) {
	let outerHTML = '';

	obj.each(function () {
		outerHTML += $(this).prop('outerHTML');
	});

	return outerHTML;
}

/**
 * 配信開始からの時間を取得
 * @param {string} date 配信開始時間
 * @return {string}
 */
function getTimeAfterStarting(date) {
	// 現在時刻
	let now = new Date();
	// 先頭の波を削除
	date = date.replace(/～$/, '');
	// 文字列から時間(秒)に変換
	let time = (new Date(now.getFullYear(), ('0' + date.match(/\d+/)).slice(-2) - 1,
		('0' + date.match(/\d+(?=\s)/)).slice(-2),
		date.match(/\d+(?=:)/),
		date.match(/\d+$/),
		0) - now.getTime()) / -1000;

	return time;
}

/**
 * ボタンから配信者名を取得
 * @param {Object} button ボタン
 * @return {string} 配信者名
 */
function nameFromDisableButton(button) {
	return $(button).prev().prev().text().replace(/\r?\n/g, '');
	// return $(button).parent().prevAll('td.name').children('a').text().replace(/\r?\n/g, '');
}

/**
 * お気に入りボタンから配信者名を取得
 * @param {Object} favoriteMark お気に入りボタン
 * @return {string} 配信者名
 */
function nameFromFavoriteButton(favoriteMark) {
	return $(favoriteMark).prev().text().replace(/\r?\n/g, '');
}

/**
 * ボタンのあるテーブルの行を削除
 * @param {Object} button ボタン
 */
function deleteRow(button) {
	$(button).parent().parent().remove();
	// console.log($(button).prev().text().replace(/\r?\n/g,'') + ' delete');
}

/////////////////////////////
// デバッグ
/////////////////////////////

// デバッグボタン
// $('.debug_button').on('click', function () {
//     alert(getDisableList());
// });
