// ==UserScript==
// @name        UstreamChecker.user.js
// @namespace   a
// @description UstreamChecker.user.js
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @include     http://revinx.net/ustream/
// @include     https://revinx.net/ustream/
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @run-at      document-idle
// @version     0.1.7
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

(function() {
	'use strict';

	/////////////////////////////
	// 定数
	/////////////////////////////

	/**
	 * データベース用の名前
	 */
	const DB_NAMES = {
		DISABLE_LIST: 'disable_list',
		DISABLE_SECTION: 'disable_section',
		FAVORITE_LIST: 'favorite_list',
		TABLE_ORDER: 'table_order',
		THUMBNAIL_SETTING: 'thumbnail_setting',
		FIRST_LIST: '1st_list_section',
		SECOND_LIST: '2nd_list_section',
		OTHER: 'other_section',
		EVENT_TICKER: 'event_ticker',
		MISC_SETTING: 'misc_setting',
	};

	/**
	 * 色
	 */
	const COLORS = {
		UNFAVORITE_MARK: 'rgb(128, 128, 128)',
		FAVORITE_MARK: 'rgb(255, 140, 0)',
		FAVORITE_ROW: 'rgb(255, 246, 202)',
		UNDISABLE_MARK: 'rgb(128, 128, 128)',
		DISABLE_MARK: 'rgb(255, 0, 0)',
	};

	/**
	 * サムネイル表示モード
	 */
	const THUMBNAIL_MODES = {
		DEFAULT: 'default',
		MOUSE_OVER: 'mouse_over',
		ALLWAYS: 'allways',
	};

	/**
	 * テーブル並び替え用の名前
	 */
	const TABLE_ORDERS = {
		DEFAULT: 'default',
		ALPHABETICAL: 'alphabetical',
		START_TIME: 'startTime',
		ID: 'id',
	};

	/////////////////////////////
	// 変数
	/////////////////////////////

	let disableList;
	let disableSection;
	let FavoriteList;
	let TableOrder;
	let thumbnailSetting;
	let miscSetting;

	/////////////////////////////
	// ページ読み込み後
	/////////////////////////////

	$(window).load(function() {
		/////////////////////////////
		// ボタンの処理
		/////////////////////////////

		// お気に入りボタン
		let buttonContent = '<a class="favoriteMark" title="お気に入り">★</a>';
		// 非表示ボタン
		buttonContent += '<a class="disableButton" title="非表示">×</a>';
		// ボタンを挿入
		$('td.name > a').after(buttonContent);

		// その他の情報開閉トグルボタン
		$('.noblk').last().before('<br><input type="button" id="otherToggleButton" value="その他の情報を格納">');
		// その他の情報をまとめる
		$('#otherToggleButton').nextAll().wrapAll('<div id="otherToggle" />');

		// ボタン用CSS
		let addCSS = '.favoriteMark, .disableButton, .favoritedMark {cursor: pointer; margin: 2px; font-weight: bold;}' +
			' .favoriteMark {color:' + COLORS.UNFAVORITE_MARK + '}' +
			' .disableButton {color: ' + COLORS.UNDISABLE_MARK + '}' +
			' .favoritedMark {color:' + COLORS.FAVORITE_MARK + ';}' +
			' .favoriteMark:hover, .disableButton:hover, .favoritedMark:hover {font-size: 30px;}' +
			' .favoriteMark:hover {color:' + COLORS.FAVORITE_MARK + ' !important;}' +
			' .disableButton:hover {color:' + COLORS.DISABLE_MARK + ' !important;}' +
			' .favoritedMark:hover {color:' + COLORS.UNFAVORITE_MARK + ' !important;}';

		// ボタン装飾用CSS
		addCSS +=
			'.button {width: 100px; margin: 2px 2px 2px auto; position: relative; background-color: #1abc9c; border-radius: 8px; color: #fff; line-height: 28px; -webkit-transition: none; transition: none; box-shadow: 0 3px 0 #0e8c73; text-shadow: 0 1px 1px rgba(0, 0, 0, .3);}' +
			'.button:hover {background-color: #52bca7; box-shadow: 0 3px 0 #23a188;}' +
			'.button:active {top: 3px; box-shadow: none;}';

		/////////////////////////////
		// テーブル用CSS
		/////////////////////////////

		addCSS += 'tr.favorite > td {background-color: ' + COLORS.FAVORITE_ROW + ' !important;}';

		/////////////////////////////
		// モーダルウィンドウ
		/////////////////////////////

		// モーダルウィンドウボタンを挿入
		$('#topMenuBar > ul').append('<li><a data-target="wm" class="modal-open" style="cursor: pointer;">拡張スクリプト設定</a></li>');
		// モーダルウィンドウ本体を挿入
		$('body').append('<div id="mw" class="modal-content"></div>');
		let mw = $('div.modal-content');

		// タイトル
		let mwContent = '<h2>拡張スクリプト設定 &lt; ' + GM_info.script.name + ' version ' + GM_info.script.version + ' &gt;</h2>';
		// 左メニュー
		mwContent +=
			'<div class="modal-left">' +
			'	<ul>' +
			'		<li id="menu-all">すべて</li>' +
			'		<li id="menu-favorite">お気に入り</li>' +
			'		<li id="menu-disable">非表示</li>' +
			'		<li id="menu-sort">ソート</li>' +
			'		<li id="menu-thumbnail">サムネイル</li>' +
			'		<li id="menu-misc">その他の設定</li>' +
			'	</ul>' +
			'</div>';
		// 右ペイン
		mwContent += '<div class="modal-right">';
		// お気に入りリスト
		mwContent +=
			'<div class="modal-item" id="modal-favorite">' +
			'	<h3>お気に入りリスト</h3>' +
			'	<textarea value="" id="favoriteListText" rows="5" wrap="hard" style="width:100%; max-width:100%; min-width:100%;" />' +
			'	<input type="button" class="button" id="favoriteListSaveButton" value="保存">' +
			'	<input type="button" class="button" id="favoriteListInitializeButton" value="初期化">' +
			'</div>';
		// 非表示リスト
		mwContent +=
			'<div class="modal-item" id="modal-disableList">' +
			'	<h3>非表示リスト</h3>' +
			'	<textarea value="" id="disableListText" rows="5" wrap="hard" style="width:100%; max-width:100%; min-width:100%;" />' +
			'	<input type="button" class="button" id="disableListSaveButton" value="保存">' +
			'	<input type="button" class="button" id="disableListInitializeButton" value="初期化">' +
			'</div>';
		// 非表示セクション
		mwContent +=
			'<div class="modal-item" id="modal-disableSection">' +
			'	<h3>部分非表示(チェックすると非表示)</h3>' +
			'	<div class="modal-item">' +
			'		<input type="checkbox" class="disableSectionCheckbox" id="1st_list_section"><label for="1st_list_section">1次チェッカー</label>' +
			'		<input type="checkbox" class="disableSectionCheckbox" id="2nd_list_section"><label for="2nd_list_section">2次チェッカー</label>' +
			'		<input type="checkbox" class="disableSectionCheckbox" id="other_section"><label for="other_section">その他の情報</label>' +
			'	</div>' +
			'	<div class="modal-item">' +
			'		<input type="checkbox" class="disableSectionCheckbox" id="event_ticker"><label for="event_ticker">イベントティッカー</label>' +
			'	</div>' +
			'	<input type="button" class="button" id="disableSectionInitializeButton" value="初期化">' +
			'</div>';
		// ソート順
		mwContent +=
			'<div class="modal-item" id="modal-sort">' +
			'	<h3>ソート順</h3>' +
			'	<input type="radio" class="orderRadio" id="defaultOrderRadio" name="orderRadio"><label for="defaultOrderRadio">デフォルト(視聴者人数順)</label>' +
			'	<input type="radio" class="orderRadio" id="alphabeticalOrderRadio" name="orderRadio"><label for="alphabeticalOrderRadio">配信者名のあいうえお順</label>' +
			'	<input type="radio" class="orderRadio" id="startTimeOrderRadio" name="orderRadio"><label for="startTimeOrderRadio">配信開始時間順</label>' +
			'	<input type="radio" class="orderRadio" id="idOrderRadio" name="orderRadio"><label for="idOrderRadio">登録番号順</label>' +
			'</div>';
		// サムネイル設定
		mwContent +=
			'<div class="modal-item" id="modal-thumbnail">' +
			'	<h3>サムネイル表示</h3>' +
			'	<div class="modal-item thumbnailMode">' +
			'		<input type="radio" class="thumbnailCustomRadio" id="thumbnailDefault" name="thumbnailRadio"><label for="thumbnailDefault">デフォルト</label>' +
			'		<input type="radio" class="thumbnailCustomRadio" id="thumbnailMouseOver" name="thumbnailRadio"><label for="thumbnailMouseOver">マウスオーバー</label>' +
			'		<s><input type="radio" class="thumbnailCustomRadio" id="thumbnailAlways" name="thumbnailRadio"><label for="thumbnailAlways">常にサムネイルで表示する</label></s>' +
			'	</div>' +
			'	<div class="modal-item thumbnailSize">' +
			'		<h4>画像の大きさ</h4>' +
			'		<div class="thumbnailSample-item">' +
			'			<p id="sampleImageKeepAspect">' +
			'				<input type="checkbox" class="thumbnailRatioCheckbox" id="thumbnailAutoRatio"><label for="thumbnailAutoRatio">画像のアスペクト比を変更しない</label>' +
			'			</p>' +
			'			<p id="sampleImageWidth">' +
			'				横<input type="number" id="thumbnailWidth" value="50" min="50">px' +
			'			</p>' +
			'			<p id="sampleImageHeight">' +
			'				縦<input type="number" id="thumbnailHeight" value="50" min="50">px' +
			'			</p>' +
			'		</div>' +
			'		<div class="thumbnailSample-item">' +
			'			<div class="thumbnailSampleImage">' +
			'				<img class="thumbnailSampleImage" alt="thumbnail" width="50px" height="50px" src="./img/ust_s.png">' +
			'				<figcaption>50px : 50px</figcaption>' +
			'			</div>' +
			'		</div>' +
			'	</div>' +
			'</div>';
		// その他の機能
		Object.keys(modalContents.rightPane.misc).forEach(function(key) {
			console.log();
		}, modalContents.rightPane.misc);
		mwContent +=
			'<div class="modal-item" id="modal-misc">' +
			'	<h3>その他の機能</h3>' +
			'	<div class="modal-item">' +
			'		<h3>トピック</h3>' +
			'		<input type="checkbox" class="miscCheckbox" id="topicLinefeed"><label for="topicLinefeed">トピックを一つずつ改行して表示する</label><br>' +
			'		<input type="checkbox" class="miscCheckbox" id="topicRestore"><label for="topicRestore">省略されているトピックを復元</label>' +
			'	</div>' +
			'	<div class="modal-item">' +
			'		<h3>リンク変更</h3>' +
			'		<input type="checkbox" class="miscCheckbox" id="niconamaLinkChange"><label for="niconamaLinkChange">ニコ生のURLをlv123456789からco123456789に変更</label>' +
			'	</div>' +
			'</div>';
		mwContent += '</div>';
		// 閉じるボタン
		mwContent += '<input type="button" class="button" id="modal-close" value="閉じる">';

		let modalContents = {
			leftMenu: {
				class: 'modal-left',
				menuAll: {
					id: 'menu-all',
					value: 'すべて',
				},
				menuFavorite: {
					id: 'menu-favorite',
					value: 'お気に入り',
				},
				menuDisable: {
					id: 'menu-disable',
					value: '非表示',
				},
				menuSort: {
					id: 'menu-sort',
					value: 'ソート',
				},
				menuThumbnail: {
					id: 'menu-thumbnail',
					value: 'サムネイル',
				},
				menuMisc: {
					id: 'menu-misc',
					value: 'その他の設定',
				},
			},
			rightPane: {
				class: 'modal-right',
				misc: {
					class: 'modal-item',
					id: 'modal-misc',
					title: {
						type: 'title',
						value: 'その他の機能',
					},
					topic: {
						title: {
							type: 'title',
							value: 'トピック',
						},
						topicLinefeed: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'topicLinefeed',
							label: 'トピックを一つずつ改行して表示する',
						},
						topicRestore: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'topicRestore',
							label: '省略されているトピックを復元',
						},
					},
					link: {
						niconamaLinkChange: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'niconamaLinkChange',
							label: 'ニコ生のURLを個別番号(lv123456789)からコミュニティ番号(co123456789)に変更',
						},
					},
				},
			},
		};

		// 挿入
		mw.append(mwContent);

		// modal-window用CSS
		addCSS += '.modal-content {position: absolute; overflow: auto; display: none; z-index: 100; width: 75%; margin: 0; padding: 10px 20px; border: 2px solid #aaa; background: #fff;}' +
			'.modal-left {display: table-cell; width: 190px; border-right: 8px dotted #CCC;}' +
			'.modal-right {display: table-cell; width: inherit;}' +
			'.modal-left ul {list-style-type: none; padding: 10px 0px 10px 5px;}' +
			'.modal-left li {border: 1px solid #9F99A3; border-radius: 6px; background-color: #EEEEEE; padding: 3px 10px; text-decoration: none; color: #333; width: 150px; margin: 2px 0px; text-align: left; font-size: 18px;}' +
			'.modal-left li:hover {border: 1px solid #8593A9; background-color: #9EB7DD;}' +
			'.selected-menu {background-color: #FFF6CA !important;}' +
			'.modal-item {border: medium solid #CCC; padding: 10px; border-radius: 10px; margin: 10px; border-collapse: separate; border-spacing: 10px 0px;}' +
			'.thumbnailSample-item {display: table-cell; width: 260px; text-align: center; vertical-align: middle; border: medium solid #CCC; padding: 10px; border-radius: 10px;}' +
			'.thumbnailSample-item > * {margin: 2px;}' +
			'div.thumbnailSampleImage {background: #CCC;}' +
			'input[type=number] {text-align: right;}';

		// modal-overlay用CSS
		addCSS += '.modal-overlay {z-index: 99; display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75);}';

		// CSSをまとめて設定
		GM_addStyle(addCSS);

		/////////////////////////////
		// 設定の反映
		/////////////////////////////

		// 非表示セクションの反映
		updateDisableSection();

		// リスト適用
		$('td.name > a[href]').each(function() {
			// 非表示リストの反映
			let name = $(this).text().replace(/\r?\n/g, '');
			if ($.inArray(name, getDisableList()) != -1) {
				deleteRow(this);
			}

			// お気に入りリストの反映
			if ($.inArray(name, getFavoriteList()) >= 0) {
				// ★の色変更
				$(this).next().removeClass('favoriteMark').addClass('favoritedMark');
				// お気に入りへ移動
				moveFavoriteRow($(this).parent().parent());
			}
		});

		// テーブルソートの反映
		updateTableOrder(true);

		// サムネイル表示の反映
		updateThumbnailSetting(true);

		// トピックを改行して表示
		if (getMiscSetting().topicLinefeed) {
			$('td.topic > img+img').before(function() {
				$(this).before('<br>');
			});
		}

		// 省略されているトピックを復活
		if (getMiscSetting().topicRestore) {
			$('p.arrow_box').each(function() {
				// 省略されていないトピックを取得
				let topic = $(this).html().replace(/^<br>/g, '').replace(/<br>$/g, '');
				// 反映
				$(this).parent().html(topic);
			});
		}

		// ニコ生リンク修正
		if (getMiscSetting().niconamaLinkChange) {
			$('td.status img[alt="nico"]').each(function() {
				let url = $(this).parent('a').attr('href').substring(0, 32) +
					$(this).closest('.status').nextAll('.archives').find('img[alt="nico"]').parent().attr('href').split('?')[0].substr(38);

				$(this).parent('a').attr('href', url);
			});
		}

		// イベントバーを移動
		$('.ticker').insertBefore('.noblk:first');

		/////////////////////////////
		// ボタンイベント
		/////////////////////////////

		// 非表示ボタン
		$('.disableButton').on('click', function() {
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
		$(document).on('click', '.favoriteMark', function() {
			// リストにない
			addFavoriteList(nameFromFavoriteButton(this));
			$(this).removeClass('favoriteMark').addClass('favoritedMark');
			// お気に入りへ移動
			moveFavoriteRow($(this).parent().parent());
		});
		// お気に入り解除ボタン
		$(document).on('click', '.favoritedMark', function() {
			let index = $.inArray(nameFromFavoriteButton(this), getFavoriteList());
			// リストから削除
			removeFavoriteList(index);
			// マーク変更
			$(this).removeClass('favoritedMark').addClass('favoriteMark');
			// お気に入り外へ移動
			removeFavoriteRow($(this).parent().parent());
		});

		// その他欄の非表示トグルボタン
		$('#otherToggleButton').on('click', function() {
			toggleSection(DB_NAMES.OTHER);
		});

		/////////////////////////////
		// モーダルウィンドウイベント
		/////////////////////////////

		// 「.modal-open」をクリック
		$('.modal-open').on('click', function() {
			// 重複を防ぐ
			if ($('div').hasClass('modal-overlay')) {
				$('.modal-overlay').trigger('click');
				return;
			}

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
			// モーダルウィンドウに設定内容を表示
			/////////////////////////////

			// 左メニューのデフォルト
			if (!$('li').hasClass('selected-menu')) {
				$('#menu-all').addClass('selected-menu');
			}

			// 非表示リストの中身を表示
			$('#disableListText').val(getDisableList());
			// 非表示セクションのチェックボックスを反映
			$('.disableSectionCheckbox').each(function() {
				if (getDisableSection()[$(this).attr('id')]) {
					// チェックあり
					$(this).prop('checked', true);
				} else {
					// チェックなし
					$(this).prop('checked', false);
				}
			});
			// お気に入りリストの中身を表示
			$('#favoriteListText').val(getFavoriteList());

			// その他の設定を表示
			$('#topicLinefeed').prop('checked', getMiscSetting().topicLinefeed);
			$('#topicRestore').prop('checked', getMiscSetting().topicRestore);
			$('#niconamaLinkChange').prop('checked', getMiscSetting().niconamaLinkChange);

			/////////////////////////////
			// 設定ウィンドウ内の初期化ボタン
			/////////////////////////////

			// 非表示リストを初期化ボタン
			$('#disableListInitializeButton').on('click', function() {
				initializeDisableListDB();
				$('disableListText').val(getDisableList());
			});
			// お気に入りリストを初期化
			$('#favoriteListInitializeButton').on('click', function() {
				initializeFavoriteListDB();
				$('#favoriteListText').val(getFavoriteList());
			});
			// 非表示セクションリストを初期化
			$('#disableSectionInitializeButton').on('click', function() {
				initializeDisableSectionDB();
				// チェックボックスを再反映
				$('.disableSectionCheckbox').each(function() {
					if (getDisableSection()[$(this).attr('id')]) {
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
			$('#disableListSaveButton').on('click', function() {
				if (confirm('非表示リストを保存しますか？')) {
					// OK
					let dlist = $('#disableListText').val().split(',');
					setDisableList(dlist);
				}
			});
			// 非表示セクションのチェックボックス
			$('.disableSectionCheckbox').on('change', function() {
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
			$('#favoriteListSaveButton').on('click', function() {
				if (confirm('お気に入りリストを保存しますか？')) {
					// OK
					let flist = $('#favoriteListText').val().split(',');
					setFavoriteList(flist);
				}
			});
			// テーブル並び替え切り替え
			$('.orderRadio').on('change', function() {
				let id = $(this).attr('id');

				switch (id) {
					case 'defaultOrderRadio':
						setTableOrder(TABLE_ORDERS.DEFAULT);
						break;
					case 'alphabeticalOrderRadio':
						setTableOrder(TABLE_ORDERS.ALPHABETICAL);
						break;
					case 'startTimeOrderRadio':
						setTableOrder(TABLE_ORDERS.START_TIME);
						break;
					case 'idOrderRadio':
						setTableOrder(TABLE_ORDERS.ID);
						break;
				}
			});
			// サムネイルモード切替
			$('.thumbnailCustomRadio').on('change', function() {
				let ts = getThumbnailSetting();
				let tsMode = $(this).attr('id');

				switch (tsMode) {
					case $('#thumbnailDefault').attr('id'):
						ts.mode = THUMBNAIL_MODES.DEFAULT;
						break;
					case $('#thumbnailMouseOver').attr('id'):
						ts.mode = THUMBNAIL_MODES.MOUSE_OVER;
						break;
					case $('#thumbnailAlways').attr('id'):
						ts.mode = THUMBNAIL_MODES.ALLWAYS;
						break;
				}

				setThumbnailSetting(ts);
			});
			// サムネイルサイズアスペクト比保持
			$('#thumbnailAutoRatio').on('change', function() {
				let ts = getThumbnailSetting();

				if ($(this).prop('checked')) {
					ts.keepAspect = true;
				} else {
					ts.keepAspect = false;
				}

				setThumbnailSetting(ts);
			});
			// サムネイルサイズ変更
			$('#thumbnailWidth, #thumbnailHeight').on('change', function() {
				let ts = getThumbnailSetting();
				ts.width = Number($('#thumbnailWidth').val());
				ts.height = Number($('#thumbnailHeight').val());

				setThumbnailSetting(ts);
			});

			// 左メニューをクリックで右ペインを変更
			$('li[id^="menu"]').on('click', function() {
				// クラス切替
				$('.selected-menu').removeClass('selected-menu');
				$(this).addClass('selected-menu');

				// 右ペインの変更
				modalSelectRightPane($(this).attr('id'));
			});

			// その他の設定のチェックボックス
			$('#topicLinefeed').on('change', function() {
				miscSetting.topicLinefeed = !miscSetting.topicLinefeed;
				setMiscSetting(miscSetting);
			});
			$('#topicRestore').on('change', function() {
				miscSetting.topicRestore = !miscSetting.topicRestore;
				setMiscSetting(miscSetting);
			});
			$('#niconamaLinkChange').on('change', function() {
				miscSetting.niconamaLinkChange = !miscSetting.niconamaLinkChange;
				setMiscSetting(miscSetting);
			});

			/////////////////////////////
			// モーダルウィンドウの処理
			/////////////////////////////

			// 「.modal-overlay」あるいは「.modal-close」をクリック
			$('.modal-overlay, #modal-close').off().on('click', function() {
				// モーダルコンテンツとオーバーレイをフェードアウト
				modal.fadeOut('slow');
				modalOverlay.fadeOut('slow', function() {
					// オーバーレイを削除
					modalOverlay.remove();
				});
			});

			// リサイズしたら表示位置を再設定
			$(window).on('resize', function() {
				modalResize();
			});

			/**
			 * モーダルコンテンツの表示位置を設定する関数
			 */
			function modalResize() {
				// モーダルコンテンツの表示位置を取得
				let x = ($(window).width() - modal.outerWidth(true)) / 2;
				let y = 50; //($(window).height() - modal.outerHeight(true)) / 2;
				let width = $(window).width() * 0.75;

				// モーダルコンテンツの表示位置を設定
				modal.css({
					'left': x + 'px',
					'top': y + 'px',
					'width': width + 'px',
				});
			}

			/**
			 * 右ペインの表示項目を選択
			 * @param {string} pain ペイン内divのid
			 */
			function modalSelectRightPane(pain) {
				let menuAll = $('#modal-favorite, #modal-disableList, #modal-disableSection, #modal-sort, #modal-thumbnail, #modal-misc');

				switch (pain) {
					case 'menu-favorite':
						menuAll.toggle(false);
						$('#modal-favorite').toggle(true);
						break;
					case 'menu-disable':
						menuAll.toggle(false);
						$('#modal-disableList, #modal-disableSection').toggle(true);
						break;
					case 'menu-sort':
						menuAll.toggle(false);
						$('#modal-sort').toggle(true);
						break;
					case 'menu-thumbnail':
						menuAll.toggle(false);
						$('#modal-thumbnail').toggle(true);
						break;
					case 'menu-misc':
						menuAll.toggle(false);
						$('#modal-misc').toggle(true);
						break;
					case 'menu-all':
					default:
						menuAll.toggle(true);
						break;
				}
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
		if (GM_getValue(DB_NAMES.DISABLE_LIST) != undefined) {
			if (!confirm('非表示リストを初期化しますか？')) {
				return;
			}
		}

		GM_setValue(DB_NAMES.DISABLE_LIST, []);
		disableList = GM_getValue(DB_NAMES.DISABLE_LIST);
	}

	/**
	 * 非表示リストの読み込み
	 * @return {Array.<string>}
	 */
	function getDisableList() {
		if (disableList == undefined) {
			if (GM_getValue(DB_NAMES.DISABLE_LIST) == undefined) {
				initializeDisableListDB();
			}

			disableList = GM_getValue(DB_NAMES.DISABLE_LIST);
		}

		return disableList;
	}

	/**
	 * 非表示リストの反映
	 * @param {Array.<string>} list 非表示リスト
	 */
	function setDisableList(list) {
		GM_setValue(DB_NAMES.DISABLE_LIST, list);
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
		if (GM_getValue(DB_NAMES.DISABLE_SECTION) != undefined) {
			if (!confirm('非表示リストを初期化しますか？')) {
				return;
			}
		}

		let dsInitial = {
			FIRST_LIST_SECTION_DB_NAME: false,
			SECOND_LIST_SECTION_DB_NAME: false,
			OTHER_SECTION_DB_NAME: true,
			EVENT_TICKER_DB_NAME: false,
		};

		GM_setValue(DB_NAMES.DISABLE_SECTION, dsInitial);
		disableSection = GM_getValue(DB_NAMES.DISABLE_SECTION);
	}

	/**
	 * 非表示セクションの読み込み
	 * @return {Array.<string,boolean>} 非表示セクション
	 */
	function getDisableSection() {
		if (disableSection == undefined) {
			if (GM_getValue(DB_NAMES.DISABLE_SECTION) == undefined) {
				initializeDisableSectionDB();
			}

			disableSection = GM_getValue(DB_NAMES.DISABLE_SECTION);
		}

		return disableSection;
	}

	/**
	 * 非表示セクションを保存
	 * @param {string} section セクション名
	 * @param {boolean} bool trueで非表示
	 */
	function setDisableSection(section, bool) {
		let ds = getDisableSection();
		ds[section] = bool;

		disableSection = ds;
		GM_setValue(DB_NAMES.DISABLE_SECTION, ds);
		updateDisableSection();
	}

	/**
	 * 非表示セクションを更新
	 */
	function updateDisableSection() {
		let firstListSection = $('.noblk').first();
		let secondListSection = $('.noblk').eq(1);
		let otherSection = $('#otherToggle');
		let otherToggleButton = $('#otherToggleButton');
		let eventTicker = $('.ticker');
		let ds = getDisableSection();

		firstListSection.toggle((ds[DB_NAMES.FIRST_LIST]) ? false : true);
		secondListSection.toggle((ds[DB_NAMES.SECOND_LIST]) ? false : true);

		if (ds[DB_NAMES.OTHER]) {
			otherSection.toggle(false);
			// ボタンテキストを変更
			otherToggleButton.val('その他の情報を展開');
		} else {
			otherSection.toggle(true);
			// ボタンテキストを変更
			otherToggleButton.val('その他の情報を格納');
		}

		eventTicker.toggle((ds[DB_NAMES.OTHER]) ? false : true);
	}

	/**
	 * セクションの表示を切り替え
	 * @param {string} section セクション名
	 */
	function toggleSection(section) {
		let ds = getDisableSection();

		switch (section) {
			case DB_NAMES.FIRST_LIST:
				ds[DB_NAMES.FIRST_LIST] = !ds[DB_NAMES.FIRST_LIST];
				break;
			case DB_NAMES.SECOND_LIST:
				ds[DB_NAMES.SECOND_LIST] = !ds[DB_NAMES.SECOND_LIST];
				break;
			case DB_NAMES.OTHER:
				ds[DB_NAMES.OTHER] = !ds[DB_NAMES.OTHER];
				break;
			case DB_NAMES.EVENT_TICKER:
				ds[DB_NAMES.EVENT_TICKER] = !ds[DB_NAMES.EVENT_TICKER];
				break;
		}

		disableSection = ds;
		GM_setValue(DB_NAMES.DISABLE_SECTION, ds);
		updateDisableSection();
	}

	/////////////////////////////
	// お気に入り
	/////////////////////////////

	/**
	 * お気に入りリストを初期化
	 */
	function initializeFavoriteListDB() {
		if (GM_getValue(DB_NAMES.FAVORITE_LIST) != undefined) {
			if (!confirm('お気に入りリストを初期化しますか？')) {
				return;
			}
		}

		GM_setValue(DB_NAMES.FAVORITE_LIST, []);
		FavoriteList = GM_getValue(DB_NAMES.FAVORITE_LIST);
	}

	/**
	 * お気に入りリストの取得
	 * @return {Array.<string>} お気に入りリスト
	 */
	function getFavoriteList() {
		if (FavoriteList == undefined) {
			if (GM_getValue(DB_NAMES.FAVORITE_LIST) == undefined) {
				initializeFavoriteListDB();
			}

			FavoriteList = GM_getValue(DB_NAMES.FAVORITE_LIST);
		}

		return FavoriteList;
	}

	/**
	 * お気に入りリストを保存
	 * @param {Array.<string>} list お気に入りリスト
	 */
	function setFavoriteList(list) {
		GM_setValue(DB_NAMES.FAVORITE_LIST, list);
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
			$(row).find('td.status a > img').attr('src', function() {
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
		if (GM_getValue(DB_NAMES.TABLE_ORDER) != undefined) {
			if (!confirm('並び替えを初期化しますか？')) {
				return;
			}
		}

		GM_setValue(DB_NAMES.TABLE_ORDER, TABLE_ORDERS.DEFAULT);
		TableOrder = GM_getValue(DB_NAMES.TABLE_ORDER);
	}

	/**
	 * テーブル並び替え設定を取得
	 * @return {string} テーブル並び替え設定
	 */
	function getTableOrder() {
		if (TableOrder == undefined) {
			if (GM_getValue(DB_NAMES.TABLE_ORDER) == undefined) {
				initializeTableOrderDB();
			}

			TableOrder = GM_getValue(DB_NAMES.TABLE_ORDER);
		}

		return TableOrder;
	}

	/**
	 * テーブル並び替え設定を設定
	 * @param {string} order テーブル並び替え設定
	 */
	function setTableOrder(order) {
		TableOrder = order;
		GM_setValue(DB_NAMES.TABLE_ORDER, TableOrder);
		updateTableOrder(false);
	}

	/**
	 * テーブルのソート順を更新
	 * @param {boolean} firstFlag 初期更新かどうか
	 */
	function updateTableOrder(firstFlag) {
		switch (getTableOrder()) {
			case TABLE_ORDERS.DEFAULT:
				if (firstFlag) {
					$('#defaultOrderRadio').prop('checked', true);
					break;
				} else {
					reorderDefault();
					break;
				}
			case TABLE_ORDERS.ALPHABETICAL:
				if (firstFlag) {
					$('#alphabeticalOrderRadio').prop('checked', true);
					reorderAlphabetical();
					break;
				} else {
					if (confirm('ページを更新します')) {
						location.reload();
					}
					break;
				}
			case TABLE_ORDERS.START_TIME:
				if (firstFlag) {
					$('#startTimeOrderRadio').prop('checked', true);
					reorderStartTime();
					break;
				} else {
					if (confirm('ページを更新します')) {
						location.reload();
					}
					break;
				}
			case TABLE_ORDERS.ID:
				if (firstFlag) {
					$('#idOrderRadio').prop('checked', true);
					reorderId();
					break;
				} else {
					if (confirm('ページを更新します')) {
						location.reload();
					}
					break;
				}
		}
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
		favoriteOnline = $(favoriteOnline).sort(function(a, b) {
			return $(a).find('td.name > a[href]').text() < $(b).find('td.name > a[href]').text() ? -1 : 1;
		});
		let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

		// オンライン
		let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
		online = $(online).sort(function(a, b) {
			return $(a).find('td.name > a[href]').text() < $(b).find('td.name > a[href]').text() ? -1 : 1;
		});
		online = getOuterHTML($(online));

		// オフライン
		let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

		// 非表示
		let invisible = getOuterHTML($('#firstList tr.invisible'));

		// 2次
		let second = getOuterHTML($('#secondList tr.online'));
		second = $(second).sort(function(a, b) {
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
		favoriteOnline = $(favoriteOnline).sort(function(a, b) {
			return getTimeAfterStarting($(a).find('span.date').text()) > getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
		});
		let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

		//オンライン
		let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
		online = $(online).sort(function(a, b) {
			return getTimeAfterStarting($(a).find('span.date').text()) > getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
		});
		online = getOuterHTML($(online));

		// オフライン
		let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

		// 非表示
		let invisible = getOuterHTML($('#firstList tr.invisible'));

		// 2次
		let second = getOuterHTML($('#secondList tr.online'));
		second = $(second).sort(function(a, b) {
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
		favoriteOnline = $(favoriteOnline).sort(function(a, b) {
			return getTimeAfterStarting($(a).find('span.date').text()) < getTimeAfterStarting($(b).find('span.date').text()) ? -1 : 1;
		});
		let favorite = getOuterHTML($(favoriteOnline)) + favoriteOffline;

		//オンライン
		let online = getOuterHTML($('#firstList tr.online').not('.favorite'));
		online = $(online).sort(function(a, b) {
			return Number($(a).find('td.log > a').attr('href').slice(14)) < Number($(b).find('td.log > a').attr('href').slice(14)) ? -1 : 1;
		});
		online = getOuterHTML($(online));

		// オフライン
		let offline = getOuterHTML($('#firstList tr.offline').not('.favorite'));

		// 非表示
		let invisible = getOuterHTML($('#firstList tr.invisible'));

		// 2次
		let second = getOuterHTML($('#secondList tr.online'));
		second = $(second).sort(function(a, b) {
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

		obj.each(function() {
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
	// サムネイル設定
	/////////////////////////////

	/**
	 * サムネイル設定を初期化
	 */
	function initializeThumbnailSetting() {
		if (GM_getValue(DB_NAMES.THUMBNAIL_SETTING) != undefined) {
			if (!confirm('サムネイル設定を初期化しますか？')) {
				return;
			}
		}

		GM_setValue(DB_NAMES.THUMBNAIL_SETTING, {
			mode: THUMBNAIL_MODES.DEFAULT,
			keepAspect: true,
			width: 50,
			height: 50,
		});

		thumbnailSetting = GM_getValue(DB_NAMES.THUMBNAIL_SETTING);
	}

	/**
	 * サムネイル設定を取得
	 * @return {Object} サムネイル設定
	 */
	function getThumbnailSetting() {
		if (thumbnailSetting == undefined) {
			if (GM_getValue(DB_NAMES.THUMBNAIL_SETTING) == undefined) {
				initializeThumbnailSetting();
			}

			thumbnailSetting = GM_getValue(DB_NAMES.THUMBNAIL_SETTING);
		}

		return thumbnailSetting;
	}

	/**
	 * サムネイル設定を保存
	 * @param {Object} setting サムネイル設定
	 */
	function setThumbnailSetting(setting) {
		GM_setValue(DB_NAMES.THUMBNAIL_SETTING, setting);
		updateThumbnailSetting(false);
	}

	/**
	 * サムネイル表示を更新
	 * @param {boolean} firstFlag 初期か
	 */
	function updateThumbnailSetting(firstFlag) {
		if (firstFlag) {
			let ts = getThumbnailSetting();
			applyThumbnailMode(ts.mode);


			// 横指定
			let style = '.thumbnail { width: ' + ts.width + 'px; ';
			if (!ts.keepAspect) {
				// 縦指定
				style += 'height: ' + ts.height + 'px; ';
			}
			style += '}';

			let css = $('head style:contains(".thumbnail {")');
			if (css.length != 0) {
				css.text(style);
			} else {
				GM_addStyle(style);
			}

			switch (ts.mode) {
				case THUMBNAIL_MODES.DEFAULT:
					$('#thumbnailDefault').prop('checked', true);
					$('.thumbnailSize').hide();
					return;
				case THUMBNAIL_MODES.MOUSE_OVER:
					$('#thumbnailMouseOver').prop('checked', true);
					break;
				case THUMBNAIL_MODES.ALLWAYS:
					$('#thumbnailAlways').prop('checked', true);
					break;
			}

			$('#thumbnailAutoRatio').prop('checked', ts.keepAspect);
			$('#thumbnailWidth').val(ts.width);
			$('#thumbnailHeight').val(ts.height);

			if (ts.keepAspect) {
				$('img.thumbnailSampleImage').attr('width', ts.width).removeAttr('height').next().text(ts.width + 'px : ' + 'auto');

				$('#sampleImageHeight').hide();
			} else {
				$('img.thumbnailSampleImage').attr('width', ts.width).attr('height', ts.height).next().text(ts.width + 'px : ' + ts.height + 'px');
				$('#sampleImageHeight').show();
			}
			$('div.thumbnailSampleImage').css({
				'width': ts.width,
				'height': ts.width * 0.5625 + 30 + 'px',
			});

			// サンプル画像を設定
			$('img.thumbnailSampleImage').attr('src', $('img[onmouseover]').first().attr('onmouseover').split('\'')[1]);
		} else {
			if (confirm('ページを更新します')) {
				location.reload();
			}
		}
	}

	/**
	 * サムネイル表示方法を変更
	 * @param {string} mode モード
	 */
	function applyThumbnailMode(mode) {
		switch (mode) {
			case THUMBNAIL_MODES.DEFAULT:
				break;
			case THUMBNAIL_MODES.MOUSE_OVER:
				// マウスオーバー
				$('.popup').each(function() {
					let a = $(this).find('a');
					// 通常画像
					$(a).find('img').not('[alt="beam"]').eq(1).attr('onmouseover', 'this.src=\'' + $(a).find('img').eq(0).attr('src') + '\';this.className=\'thumbnail\';').attr('onmouseout', 'this.src=\'' + $(a).find('img').eq(1).attr('src') + '\';this.className=\'\';');
					// videoタグ
					$(a).find('video').hide().parent('a').hover(
						function() {
							$(this).find('video').show();
							$(this).find('img').hide();
						},
						function() {
							$(this).find('video').hide();
							$(this).find('img').show();
						}
					);

					// 適用
					$(a).find('img.r').remove();
					$(a).appendTo($(this).parent('td.status'));
					$(this).remove();
				});
				break;
			case THUMBNAIL_MODES.ALLWAYS:
				break;
		}
	}

	/////////////////////////////
	// サムネイル設定
	/////////////////////////////

	/**
	 * その他の設定を初期化
	 */
	function initializeMiscSettingDB() {
		if (GM_getValue(DB_NAMES.MISC_SETTING) != undefined) {
			if (!confirm('その他の設定を初期化しますか？')) {
				return;
			}
		}

		GM_setValue(DB_NAMES.MISC_SETTING, {
			topicLinefeed: false,
			topicRestore: false,
			niconamaLinkChange: false,
		});

		miscSetting = GM_getValue(DB_NAMES.MISC_SETTING);
	}

	/**
	 * その他の設定を取得
	 * @return {object} その他の設定
	 */
	function getMiscSetting() {
		if (miscSetting == undefined) {
			if (GM_getValue(DB_NAMES.MISC_SETTING) == undefined) {
				initializeMiscSettingDB();
			}

			miscSetting = GM_getValue(DB_NAMES.MISC_SETTING);
		}

		return miscSetting;
	}

	/**
	 * その他の設定を設定
	 * @param {object} setting その他の設定
	 */
	function setMiscSetting(setting) {
		GM_setValue(DB_NAMES.MISC_SETTING, setting);
	}
})();
