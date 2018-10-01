// ==UserScript==
// @name        UstreamChecker.user.js
// @namespace   a
// @description UstreamChecker.user.js
// @require     https://cdn.rawgit.com/greasemonkey/gm4-polyfill/d58c4f6fbe5702dbf849a04d12bca2f5d635862d/gm4-polyfill.js
// @require     https://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @include     http://revinx.net/ustream/
// @include     https://revinx.net/ustream/
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       GM_addStyle
// @grant       GM.getValue
// @grant       GM.setValue
// @version     0.2.0
// ==/UserScript==

/////////////////////////////
// idea
/////////////////////////////

// 1次2次結合
// 1次配信を2次へ移動
// トピックの文章が同じ場合省略
// 特定の配信サイトを非表示
// トピック内のキーワードで非表示
// プログレスバー モーダルウィンドウボタン変更
// トピックが空の配信を非表示
// 設定を一つにまとめる
// ボタンサイズの設定
// 登録者の整合性チェック

(function() {
	'use strict';

	/////////////////////////////
	// 定数
	/////////////////////////////

	const UUJ = {
		// データベース用の名前
		DB_NAMES: {
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
		},
		// 色
		COLORS: {
			UNFAVORITE_MARK: 'rgb(128, 128, 128)',
			FAVORITE_MARK: 'rgb(255, 140, 0)',
			FAVORITE_ROW: 'rgb(255, 246, 202)',
			UNDISABLE_MARK: 'rgb(128, 128, 128)',
			DISABLE_MARK: 'rgb(255, 0, 0)',
		},
		// 追加するパーツ
		ADD_PARTS: {
			ModalOpenButton: {
				id: 'modal-open',
				value: '拡張スクリプト設定',
			},
			ModalCloseButton: {
				type: 'button',
				class: 'button',
				id: 'modal-close',
				value: '閉じる',
			},
			ModalOverlay: {
				class: 'modal-overlay',
			},
			FavoriteMark: {
				type: 'link',
				class: 'favoriteMark',
				label: 'お気に入り',
				value: '★',
			},
			FavoritedMark: {
				type: 'link',
				class: 'favoritedMark',
				label: 'お気に入り',
				value: '★',
			},
			DisableButton: {
				type: 'link',
				class: 'disableButton',
				label: '非表示',
				value: '×',
			},
			OtherToggleButton: {
				type: 'link',
				id: 'otherToggleButton',
				openLabel: 'その他の情報を展開',
				closeLabel: 'その他の情報を格納',
			},
		},
		// モーダルウィンドウ
		MODAL_WINDOW: {
			class: 'modal-content',
			leftMenu: {
				class: 'modal-left',
				menuAll: {
					id: 'menu-all',
					class: 'leftMenu',
					value: 'すべて',
					getSelecters: function() {
						let sel = [];

						Object.keys(UUJ.MODAL_WINDOW.rightPane).forEach(function(key) {
							if (typeof this[key] === 'object') {
								sel.push(this[key].getSelecter('id'));
							}
						}, UUJ.MODAL_WINDOW.rightPane);

						return sel.join(', ');
					},
				},
				menuFavorite: {
					id: 'menuFavorite',
					class: 'leftMenu',
					value: 'お気に入り',
					getSelecters: function() {
						return UUJ.MODAL_WINDOW.rightPane.favoriteList.getSelecter('id');
					},
				},
				menuDisable: {
					id: 'menuDisable',
					class: 'leftMenu',
					value: '非表示',
					getSelecters: function() {
						return UUJ.MODAL_WINDOW.rightPane.disableList.getSelecter('id') + ', ' + UUJ.MODAL_WINDOW.rightPane.disableSection.getSelecter('id');
					},
				},
				menuTableOrder: {
					id: 'menuTableOrder',
					class: 'leftMenu',
					value: 'ソート',
					getSelecters: function() {
						return UUJ.MODAL_WINDOW.rightPane.tableOrder.getSelecter('id');
					},
				},
				menuThumbnail: {
					id: 'menuThumbnail',
					class: 'leftMenu',
					value: 'サムネイル',
					getSelecters: function() {
						return UUJ.MODAL_WINDOW.rightPane.thumbnail.getSelecter('id');
					},
				},
				menuMisc: {
					id: 'menuMisc',
					class: 'leftMenu',
					value: 'その他の設定',
					getSelecters: function() {
						return UUJ.MODAL_WINDOW.rightPane.misc.getSelecter('id');
					},
				},
			},
			rightPane: {
				class: 'modal-right',
				favoriteList: {
					class: 'modal-item',
					id: 'modal-favorite',
					title: {
						type: 'title',
						value: 'お気に入りリスト',
					},
					info: {
						type: 'info',
						class: 'modal-info',
						value: '1次配信者は常に、2次配信者は配信中のみお気に入り表示される',
					},
					textarea: {
						type: 'textarea',
						id: 'favoriteListText',
					},
					saveButton: {
						type: 'button',
						class: 'button',
						id: 'favoriteListSaveButton',
						value: '保存',
					},
					initializeButton: {
						type: 'button',
						class: 'button',
						id: 'favoriteListInitializeButton',
						value: '初期化',
					},
				},
				disableList: {
					class: 'modal-item',
					id: 'modal-disableList',
					title: {
						type: 'title',
						value: '非表示リスト',
					},
					textarea: {
						type: 'textarea',
						id: 'disableListText',
					},
					saveButton: {
						type: 'button',
						class: 'button',
						id: 'disableListSaveButton',
						value: '保存',
					},
					initializeButton: {
						type: 'button',
						class: 'button',
						id: 'disableListInitializeButton',
						value: '初期化',
					},
				},
				disableSection: {
					class: 'modal-item',
					id: 'modal-disableSection',
					title: {
						type: 'title',
						value: '部分非表示',
					},
					info: {
						type: 'info',
						class: 'modal-info',
						value: 'チェックすると非表示',
					},
					sections: {
						class: 'modal-item',
						firstList: {
							type: 'checkbox',
							class: 'disableSectionCheckbox',
							id: '1st_list_section',
							label: '1次チェッカー',
							selecter: '.noblk:first',
							linefeed: false,
						},
						secondList: {
							type: 'checkbox',
							class: 'disableSectionCheckbox',
							id: '2nd_list_section',
							label: '2次チェッカー',
							selecter: '.noblk:eq(1)',
							linefeed: false,
						},
						other: {
							type: 'checkbox',
							class: 'disableSectionCheckbox',
							id: 'other_section',
							label: 'その他の情報',
							selecter: '#otherToggle',
							linefeed: false,
						},
					},
					other: {
						class: 'modal-item',
						eventTicker: {
							type: 'checkbox',
							class: 'disableSectionCheckbox',
							id: 'event_ticker',
							label: 'イベントティッカー',
							selecter: '.ticker',
							linefeed: false,
						},
					},
				},
				tableOrder: {
					class: 'modal-item',
					id: 'modal-sort',
					title: {
						type: 'title',
						value: 'ソート順',
					},
					default: {
						type: 'radio',
						class: 'orderRadio',
						id: 'defaultOrderRadio',
						name: 'orderRadio',
						label: 'デフォルト(視聴者人数順)',
						tableOrder: 'default',
						linefeed: false,
						execute: function() {
							// default
						},
					},
					alphabetical: {
						type: 'radio',
						class: 'orderRadio',
						id: 'alphabeticalOrderRadio',
						name: 'orderRadio',
						label: '配信者名のあいうえお順',
						tableOrder: 'alphabetical',
						linefeed: false,
						execute: function() {
							reorderAlphabetical();
						},
					},
					startTime: {
						type: 'radio',
						class: 'orderRadio',
						id: 'startTimeOrderRadio',
						name: 'orderRadio',
						label: '配信開始時間順',
						tableOrder: 'startTime',
						linefeed: false,
						execute: function() {
							reorderStartTime();
						},
					},
					checkerId: {
						type: 'radio',
						class: 'orderRadio',
						id: 'idOrderRadio',
						name: 'orderRadio',
						label: '登録番号順',
						tableOrder: 'id',
						linefeed: false,
						execute: function() {
							reorderId();
						},
					},
				},
				thumbnail: {
					class: 'modal-item',
					id: 'modal-thumbnail',
					title: {
						type: 'title',
						value: 'サムネイル表示',
					},
					mode: {
						class: 'thumbnailMode',
						default: {
							type: 'radio',
							class: 'thumbnailCustomRadio',
							id: 'thumbnailDefault',
							name: 'thumbnailCustomRadio',
							label: 'デフォルト',
							mode: 'default',
							linefeed: false,
							execute: function() {},
						},
						mouseOver: {
							type: 'radio',
							class: 'thumbnailCustomRadio',
							id: 'thumbnailMouseOver',
							name: 'thumbnailCustomRadio',
							label: 'マウスオーバー',
							mode: 'mouseOver',
							linefeed: false,
							execute: function() {
								$('.popup').each(function() {
									// aタグ
									let a = $(this).find('a');

									let url0 = $(a).find('img').eq(0).attr('src');
									let url1 = $(a).find('img').eq(1).attr('src');

									// url判定
									if (url0.match('^http*')) {
										$(a).find('img').not('[alt="beam"]').eq(1).attr(
											'onmouseover',
											'this.src=\'' + url0 + '\';this.className=\'thumbnail\';'
										).attr(
											'onmouseout',
											'this.src=\'' + url1 + '\';this.className=\'\';'
										);
									}

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
							},
						},
						// allways: {
						// 	type: 'radio',
						// 	class: 'thumbnailCustomRadio',
						// 	id: 'thumbnailAlways',
						// 	name: 'thumbnailCustomRadio',
						// 	label: '常にサムネイルで表示する',
						// 	mode: 'allways',
						// 	linefeed: false,
						// },
					},
					size: {
						class: 'thumbnailSize',
						title: {
							type: 'title',
							value: '画像の大きさ',
						},
						setting: {
							class: 'thumbnailSample-item',
							keepAspect: {
								id: 'sampleImageKeepAspect',
								item: {
									type: 'checkbox',
									class: 'thumbnailRatioCheckbox',
									id: 'thumbnailAutoRatio',
									label: '画像のアスペクト比を変更しない',
									linefeed: false,
								},
							},
							width: {
								id: 'sampleImageWidth',
								item: {
									type: 'number',
									class: 'thumbnailSizeNumber',
									id: 'thumbnailWidth',
									beforeLabel: '横',
									afterLabel: 'px',
									linefeed: false,
								},
							},
							height: {
								id: 'sampleImageHeight',
								item: {
									type: 'number',
									class: 'thumbnailSizeNumber',
									id: 'thumbnailHeight',
									beforeLabel: '縦',
									afterLabel: 'px',
									linefeed: false,
								},
							},
						},
						sampleImage: {
							class: 'thumbnailSample-item',
							item: {
								class: 'thumbnailSampleImage',
								image: {
									type: 'image',
									class: 'thumbnailSampleImage',
									alt: 'thumbnail',
								},
								figcaption: {
									type: 'figcaption',
									value: '150px : 150px',
								},
							},
						},
					},
				},
				misc: {
					class: 'modal-item',
					id: 'modal-misc',
					title: {
						type: 'title',
						value: 'その他の機能',
					},
					topic: {
						class: 'modal-item',
						title: {
							type: 'title',
							value: 'トピック',
						},
						topicLinefeed: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'topicLinefeed',
							label: 'トピックを一つずつ改行して表示する',
							linefeed: true,
							execute: function() {
								$('td.topic > img+img').before(function() {
									// 改行を追加
									$(this).before('<br>');
								});
							},
						},
						topicRestore: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'topicRestore',
							label: '省略されているトピックを復元',
							linefeed: false,
							execute: function() {
								$('p.arrow_box').each(function() {
									// 省略されていないトピックを取得
									let topic = $(this).html().replace(/^<br>/g, '').replace(/<br>$/g, '');
									// 反映
									$(this).parent().html(topic);
								});
							},
						},
					},
					link: {
						class: 'modal-item',
						title: {
							type: 'title',
							value: 'リンク変更',
						},
						fixCheckerLink: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'fixCheckerLink',
							label: '配信ページのURLをチェッカーページに固定する',
							linefeed: true,
							execute: function() {
								$('td.name a[href]').not('a[href^="./page"]').each(function() {
									// ログ欄のURLからidを取得
									let id = $(this).parent().parent().find('td.log > a').attr('href').match(/(\d*)$/g)[0];
									$(this).attr('href', './page/' + id);
								});
							},
						},
						niconamaLinkChange: {
							type: 'checkbox',
							class: 'miscCheckbox',
							id: 'niconamaLinkChange',
							label: 'ニコ生のURLを個別番号(lv123456789)からコミュニティ番号(co123456789)に変更',
							linefeed: false,
							execute: function() {
								$('td.status img[alt="nico"]').each(function() {
									// ニコ生のURL
									let url = $(this).parent('a').attr('href').substring(0, 32);
									// 登録コミュニティからコミュニティ番号を取得
									let number = $(this).closest('.status').nextAll('.archives').find('img[alt="nico"]').last().parent().attr('href').match(/(co\d+)/g);
									if (number) {
										// co
										number = number[0];
									} else {
										// ch
										number = $(this).closest('.status').nextAll('.archives').find('img[alt="nico"]').last().parent().attr('href').match(/(ch\d+)/g);
										if (number) {
											number = number[0];
										} else {
											return;
										}
									}

									$(this).parent('a').attr('href', url + number);
								});
							},
						},
					},
					getItemClass: function() {
						let c;
						Object.keys(UUJ.MODAL_WINDOW.rightPane.misc).find(function(key) {
							if (typeof this[key] === 'object' && this[key].type !== 'title') {
								Object.keys(this[key]).find(function(key) {
									if (typeof this[key] === 'object' && this[key].type !== 'title') {
										c = this[key].class;
									}
								}, this[key]);
							}
						}, UUJ.MODAL_WINDOW.rightPane.misc);

						return '.' + c;
					},
				},
			},
		},
	};

	/////////////////////////////
	// 変数
	/////////////////////////////

	let DisableList;
	let DisableSection;
	let FavoriteList;
	let TableOrder;
	let ThumbnailSetting;
	let MiscSetting;

	/**
	 * loadConfig
	 */
	async function loadConfig() {
		DisableList = await GM.getValue(UUJ.DB_NAMES.DISABLE_LIST);
		DisableSection = await GM.getValue(UUJ.DB_NAMES.DISABLE_SECTION);
		FavoriteList = await GM.getValue(UUJ.DB_NAMES.FAVORITE_LIST);
		TableOrder = await GM.getValue(UUJ.DB_NAMES.TABLE_ORDER);
		ThumbnailSetting = await GM.getValue(UUJ.DB_NAMES.THUMBNAIL_SETTING);
		MiscSetting = await GM.getValue(UUJ.DB_NAMES.MISC_SETTING);
	}

	/////////////////////////////
	// prototype拡張
	/////////////////////////////

	// セレクタを取得する関数を追加
	window.Object.defineProperty(Object.prototype, 'getSelecter', {
		value: function(o = 'exist') {
			if (o === 'exist') {
				if (this.class !== undefined) {
					return '.' + this.class;
				} else if (this.id !== undefined) {
					return '#' + this.id;
				} else {
					return undefined;
				}
			} else if (o === 'class' && this.class !== undefined) {
				return '.' + this.class;
			} else if (o === 'id' && this.id !== undefined) {
				return '#' + this.id;
			} else {
				return undefined;
			}
		},
	});

	debug();

	/////////////////////////////
	// 追加するボタンの処理
	/////////////////////////////

	// お気に入りボタン
	let buttonContent = generateTagFromObject(UUJ.ADD_PARTS.FavoriteMark);
	// 非表示ボタン
	buttonContent += generateTagFromObject(UUJ.ADD_PARTS.DisableButton);
	// ボタンを挿入
	$('td.name > a').after(buttonContent);

	// その他の情報開閉トグルボタンを挿入
	$('#loadBack2').parent().after('<br><input type="button" id="' + UUJ.ADD_PARTS.OtherToggleButton.id + '" value="' + UUJ.ADD_PARTS.OtherToggleButton.closeLabel + '">');
	// その他の情報をまとめる
	$(UUJ.ADD_PARTS.OtherToggleButton.getSelecter()).nextAll().wrapAll('<div id="otherToggle" />');

	// ボタン用CSS
	let addCSS =
		UUJ.ADD_PARTS.FavoriteMark.getSelecter() + ', ' + UUJ.ADD_PARTS.DisableButton.getSelecter() + ', ' + UUJ.ADD_PARTS.FavoritedMark.getSelecter() + ' {cursor: pointer; margin: 2px; font-weight: bold;} ' +
		UUJ.ADD_PARTS.FavoriteMark.getSelecter() + ' {color:' + UUJ.COLORS.UNFAVORITE_MARK + ';} ' +
		UUJ.ADD_PARTS.DisableButton.getSelecter() + ' {color: ' + UUJ.COLORS.UNDISABLE_MARK + ';} ' +
		UUJ.ADD_PARTS.FavoritedMark.getSelecter() + ' {color: ' + UUJ.COLORS.FAVORITE_MARK + ';} ' +
		UUJ.ADD_PARTS.FavoriteMark.getSelecter() + ':hover, ' + UUJ.ADD_PARTS.DisableButton.getSelecter() + ':hover, ' + UUJ.ADD_PARTS.FavoritedMark.getSelecter() + ':hover {font-size: 30px;} ' +
		UUJ.ADD_PARTS.FavoriteMark.getSelecter() + ':hover {color:' + UUJ.COLORS.FAVORITE_MARK + ' !important;} ' +
		UUJ.ADD_PARTS.DisableButton.getSelecter() + ':hover {color:' + UUJ.COLORS.DISABLE_MARK + ' !important;} ' +
		UUJ.ADD_PARTS.FavoritedMark.getSelecter() + ':hover {color:' + UUJ.COLORS.UNFAVORITE_MARK + ' !important;}';

	// ボタン装飾用CSS
	addCSS +=
		'.button {cursor: pointer; width: 100px; margin: 2px 2px 2px auto; position: relative; background-color: #1abc9c; border-radius: 8px; color: #fff; line-height: 28px; -webkit-transition: none; transition: none; box-shadow: 0 3px 0 #0e8c73; text-shadow: 0 1px 1px rgba(0, 0, 0, .3);}' +
		'.button:hover {background-color: #52bca7; box-shadow: 0 3px 0 #23a188;}' +
		'.button:active {top: 3px; box-shadow: none;}';

	/////////////////////////////
	// テーブル用CSS
	/////////////////////////////

	addCSS += 'tr.favorite > td {background-color: ' + UUJ.COLORS.FAVORITE_ROW + ' !important;}';

	/////////////////////////////
	// モーダルウィンドウ
	/////////////////////////////

	// モーダルウィンドウボタンを挿入
	$('#topMenuBar > ul').append('<li><a data-target="wm" id="' + UUJ.ADD_PARTS.ModalOpenButton.id + '" style="cursor: pointer;">' + UUJ.ADD_PARTS.ModalOpenButton.value + '</a></li>');
	// モーダルウィンドウ本体を挿入
	$('body').append('<div id="mw" class="' + UUJ.MODAL_WINDOW.class + '"></div>');

	// タイトル
	let mwContent = '<h2>拡張スクリプト設定 &lt; ' + GM.info.script.name + ' version ' + GM.info.script.version + ' &gt;</h2>';

	// 左メニュー
	mwContent += '<div class="' + UUJ.MODAL_WINDOW.leftMenu.class + '"><ul>';
	Object.keys(UUJ.MODAL_WINDOW.leftMenu).forEach(function(key) {
		if (typeof this[key] === 'object') {
			mwContent += '<li class="' + this[key].class + '" id="' + this[key].id + '">' + this[key].value + '</li>';
		}
	}, UUJ.MODAL_WINDOW.leftMenu);
	mwContent += '</ul></div>';

	// 右ペイン
	mwContent += '<div class="' + UUJ.MODAL_WINDOW.rightPane.class + '">';
	Object.keys(UUJ.MODAL_WINDOW.rightPane).forEach(function(key) {
		if (typeof this[key] === 'object') {
			mwContent += '<div class="' + this[key].class + '" id="' + this[key].id + '">';
			Object.keys(this[key]).forEach(function(key) {
				if (typeof this[key] === 'object') {
					if (this[key].type !== undefined) {
						mwContent += generateTagFromObject(this[key]);
					} else {
						mwContent += '<div class="' + this[key].class + '">';
						Object.keys(this[key]).forEach(function(key) {
							if (typeof this[key] === 'object') {
								if (this[key].type !== undefined) {
									mwContent += generateTagFromObject(this[key]);
								} else {
									mwContent += '<div class="' + this[key].class + '">';
									Object.keys(this[key]).forEach(function(key) {
										if (typeof this[key] === 'object') {
											mwContent += '<div id="' + this[key].id + '">';
											Object.keys(this[key]).forEach(function(key) {
												if (typeof this[key] === 'object') {
													mwContent += generateTagFromObject(this[key]);
												}
											}, this[key]);
											mwContent += '</div>';
										}
									}, this[key]);
									mwContent += '</div>';
								}
							}
						}, this[key]);
						mwContent += '</div>';
					}
				}
			}, this[key]);
			mwContent += '</div>';
		}
	}, UUJ.MODAL_WINDOW.rightPane);
	mwContent += '</div>';
	// 閉じるボタン
	mwContent += generateTagFromObject(UUJ.ADD_PARTS.ModalCloseButton);
	// 挿入
	$(UUJ.MODAL_WINDOW.getSelecter()).append(mwContent);

	// modal-window用CSS
	addCSS += UUJ.MODAL_WINDOW.getSelecter() + ' {position: absolute; overflow: auto; display: none; z-index: 100; width: 75%; margin: 0; padding: 10px 20px; border: 2px solid #aaa; background: #fff; border-spacing: 2px 0px;}' +
		'.modal-item, ' + UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ', ' + UUJ.MODAL_WINDOW.rightPane.getSelecter() + ', ' + UUJ.MODAL_WINDOW.rightPane.thumbnail.mode.getSelecter() + ', ' + UUJ.MODAL_WINDOW.rightPane.thumbnail.size.getSelecter() + ' {border: medium solid #CCC; padding: 10px; margin: 10px; border-collapse: separate;}' +
		// 左メニュー
		UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ' {display: table-cell; width: 190px;}' +
		UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ' ul {list-style-type: none; padding: 10px 0px 10px 5px;}' +
		UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ' li {border: 1px solid #9F99A3; background-color: #EEEEEE; padding: 3px 10px; text-decoration: none; color: #333; width: 150px; margin: 2px 0px; text-align: left; font-size: 18px; cursor: pointer;}' +
		UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ' li:hover {border: 1px solid #8593A9; background-color: #9EB7DD;}' +
		'.selected-menu {background-color: #FFF6CA !important;}' +
		// 右メニュー
		UUJ.MODAL_WINDOW.rightPane.getSelecter() + ' {display: table-cell; width: inherit;}' +
		UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.getSelecter() + ' {display: table-cell; width: 260px; text-align: center; vertical-align: middle; border: medium solid #CCC; padding: 10px;}' +
		UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.getSelecter() + ' > * {margin: 2px;}' +
		UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.item.getSelecter() + ' {background: #CCC;}' +
		'input[type=number] {text-align: right;}';

	// modal-overlay用CSS
	addCSS += UUJ.ADD_PARTS.ModalOverlay.getSelecter() + ' {z-index: 99; display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.75);}';

	// CSSをまとめて設定
	addStyle(addCSS);

	loadConfig().then().then(() => main());

	/**
	 *  main
	 */
	function main() {
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
				$(this).next().removeClass(UUJ.ADD_PARTS.FavoriteMark.class).addClass(UUJ.ADD_PARTS.FavoritedMark.class);
				// お気に入りへ移動
				moveFavoriteRow($(this).parent().parent());
			}
		});

		// テーブルソートの反映
		updateTableOrder();

		// サムネイル表示の反映
		updateThumbnailSetting();

		// その他の設定を反映
		updateMiscSetting();

		/////////////////////////////
		// ボタンイベント
		/////////////////////////////

		// 非表示ボタン
		$(UUJ.ADD_PARTS.DisableButton.getSelecter()).on('click', function() {
			let name = nameFromDisableButton($(this));

			if (confirm('[' + name + ']を非表示にしますか？')) {
				// OK
				addDisableList(name);
				deleteRow(this);
			} else {
				// cancel
				//console.log('canceled add disable list');
			}
		});

		// お気に入りボタン
		$(document).on('click', UUJ.ADD_PARTS.FavoriteMark.getSelecter(), function() {
			let name = nameFromDisableButton($(this));
			if (confirm('[' + name + ']をお気に入りに追加しますか？')) {
				// リストに追加
				addFavoriteList(name);
				// クラス変更
				$(this).removeClass(UUJ.ADD_PARTS.FavoriteMark.class).addClass(UUJ.ADD_PARTS.FavoritedMark.class);
				// お気に入りへ移動
				moveFavoriteRow($(this).parent().parent());
			}
		});
		// お気に入り解除ボタン
		$(document).on('click', UUJ.ADD_PARTS.FavoritedMark.getSelecter(), function() {
			let name = nameFromDisableButton($(this));
			if (confirm('[' + name + ']をお気に入りから削除しますか？')) {
				let index = $.inArray(name, getFavoriteList());
				// リストから削除
				removeFavoriteList(index);
				// クラス変更
				$(this).removeClass(UUJ.ADD_PARTS.FavoritedMark.class).addClass(UUJ.ADD_PARTS.FavoriteMark.class);
				// お気に入り外へ移動
				removeFavoriteRow($(this).parent().parent());
			}
		});

		// その他欄の非表示トグルボタン
		$(UUJ.ADD_PARTS.OtherToggleButton.getSelecter()).on('click', function() {
			toggleSection(UUJ.DB_NAMES.OTHER);
		});

		/////////////////////////////
		// モーダルウィンドウイベント
		/////////////////////////////

		// 「.modal-open」をクリック
		$(UUJ.ADD_PARTS.ModalOpenButton.getSelecter()).on('click', function() {
			// 重複を防ぐ
			if ($('div').hasClass(UUJ.ADD_PARTS.ModalOverlay.class)) {
				$(UUJ.ADD_PARTS.ModalOverlay.getSelecter()).trigger('click');
				return;
			}

			// オーバーレイ用の要素を追加
			$('body').append('<div class="' + UUJ.ADD_PARTS.ModalOverlay.class + '"></div>');
			// モーダルコンテンツのIDを取得
			let modal = $('#mw');
			let modalOverlay = $(UUJ.ADD_PARTS.ModalOverlay.getSelecter());
			// オーバーレイをフェードイン
			modalOverlay.fadeIn('slow');
			// モーダルコンテンツの表示位置を設定
			modalResize();
			// モーダルコンテンツフェードイン
			modal.fadeIn('slow');

			/////////////////////////////
			// 左メニュー処理
			/////////////////////////////

			// 左メニューのデフォルト
			if (!$(UUJ.MODAL_WINDOW.leftMenu.getSelecter() + ' li').hasClass('selected-menu')) {
				$(UUJ.MODAL_WINDOW.leftMenu.menuAll.getSelecter('id')).addClass('selected-menu');
			}

			// 左メニューをクリックで右ペインを変更
			$(UUJ.MODAL_WINDOW.leftMenu.menuAll.getSelecter('class')).on('click', function() {
				// クラス切替
				$('.selected-menu').removeClass('selected-menu');
				$(this).addClass('selected-menu');

				// 右ペインの変更
				let id = $(this).attr('id');
				if (id === UUJ.MODAL_WINDOW.leftMenu.menuAll.id) {
					$(UUJ.MODAL_WINDOW.leftMenu.menuAll.getSelecters()).toggle(true);
				} else {
					$(UUJ.MODAL_WINDOW.leftMenu.menuAll.getSelecters()).toggle(false);
					$(UUJ.MODAL_WINDOW.leftMenu[id].getSelecters()).toggle(true);
				}
			});

			/////////////////////////////
			// モーダルウィンドウに設定内容を表示
			/////////////////////////////

			// 非表示リストの中身を表示
			$(UUJ.MODAL_WINDOW.rightPane.disableList.textarea.getSelecter()).val(getDisableList());
			// 非表示セクションのチェックボックスを反映
			$(UUJ.MODAL_WINDOW.rightPane.disableSection.sections.firstList.getSelecter('class')).each(function() {
				if (getDisableSection()[$(this).attr('id')]) {
					// チェックあり
					$(this).prop('checked', true);
				} else {
					// チェックなし
					$(this).prop('checked', false);
				}
			});
			// お気に入りリストの中身を表示
			$(UUJ.MODAL_WINDOW.rightPane.favoriteList.textarea.getSelecter()).val(getFavoriteList());

			// その他の設定を表示
			Object.keys(UUJ.MODAL_WINDOW.rightPane.misc).forEach(function(key) {
				if (typeof this[key] === 'object' && key !== 'title') {
					Object.keys(this[key]).forEach(function(key) {
						if (typeof this[key] === 'object' && key !== 'title') {
							$(this[key].getSelecter('id')).prop('checked', getMiscSetting()[key]);
						}
					}, this[key]);
				}
			}, UUJ.MODAL_WINDOW.rightPane.misc);

			/////////////////////////////
			// 設定ウィンドウ内の初期化ボタン
			/////////////////////////////

			// お気に入りリストを初期化
			$(UUJ.MODAL_WINDOW.rightPane.favoriteList.initializeButton.getSelecter('id')).on('click', function() {
				initializeFavoriteListDB();
				$(UUJ.MODAL_WINDOW.rightPane.favoriteList.textarea.getSelecter()).val(getFavoriteList());
			});
			// 非表示リストを初期化ボタン
			$(UUJ.MODAL_WINDOW.rightPane.disableList.initializeButton.getSelecter('id')).on('click', function() {
				initializeDisableListDB();
				$(UUJ.MODAL_WINDOW.rightPane.disableList.textarea.getSelecter()).val(getDisableList());
			});

			/////////////////////////////
			// 設定ウィンドウ内の保存ボタン
			/////////////////////////////

			// お気に入りリストを保存ボタン
			$(UUJ.MODAL_WINDOW.rightPane.favoriteList.saveButton.getSelecter('id')).on('click', function() {
				if (confirm('お気に入りリストを保存しますか？')) {
					// OK
					let flist = $(UUJ.MODAL_WINDOW.rightPane.favoriteList.textarea.getSelecter()).val().split(',');
					setFavoriteList(flist);
				}
			});
			// 非表示リストを保存ボタン
			$(UUJ.MODAL_WINDOW.rightPane.disableList.saveButton.getSelecter('id')).on('click', function() {
				if (confirm('非表示リストを保存しますか？')) {
					// OK
					let dlist = $(UUJ.MODAL_WINDOW.rightPane.disableList.textarea.getSelecter()).val().split(',');
					setDisableList(dlist);
				}
			});

			/////////////////////////////
			// 設定ウィンドウ内のチェックボックス
			/////////////////////////////

			// 非表示セクションのチェックボックス
			$(UUJ.MODAL_WINDOW.rightPane.disableSection.sections.firstList.getSelecter('class')).on('change', function() {
				setDisableSection($(this).attr('id'), $(this).is(':checked'));
			});
			// サムネイルサイズアスペクト比保持
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.keepAspect.item.getSelecter('id')).on('change', function() {
				let ts = getThumbnailSetting();

				ts.keepAspect = $(this).prop('checked');

				setThumbnailSetting(ts);
			});

			/////////////////////////////
			// 設定ウィンドウ内のラジオボックス
			/////////////////////////////

			// テーブル並び替え切り替え
			$(UUJ.MODAL_WINDOW.rightPane.tableOrder.default.getSelecter('class')).on('change', function() {
				setTableOrder(UUJ.MODAL_WINDOW.rightPane.tableOrder[$(this).attr('id')].replace(/OrderRadio$/g, '').tableOrder);
			});
			// サムネイルモード切替
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.mode.default.getSelecter('class')).on('change', function() {
				let ts = getThumbnailSetting();
				let mode = lowerCaseFirst($(this).attr('id').replace(/^thumbnail/g, ''));

				ts.mode = UUJ.MODAL_WINDOW.rightPane.thumbnail.mode[mode].mode;

				setThumbnailSetting(ts);
			});

			/////////////////////////////
			// 設定ウィンドウ内の数字ボックス
			/////////////////////////////

			// サムネイルサイズ変更
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.width.item.getSelecter('class')).on('change', function() {
				let ts = getThumbnailSetting();
				ts.width = Number($(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.width.item.getSelecter('id')).val());
				ts.height = Number($(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.height.item.getSelecter('id')).val());

				setThumbnailSetting(ts);
			});

			// その他の設定のチェックボックス
			$(UUJ.MODAL_WINDOW.rightPane.misc.getItemClass()).on('change', function() {
				let ms = getMiscSetting();
				ms[$(this).attr('id')] = !ms[$(this).attr('id')];
				setMiscSetting(ms);
			});

			/////////////////////////////
			// モーダルウィンドウの処理
			/////////////////////////////

			// 「.modal-overlay」あるいは「.modal-close」をクリック
			$(UUJ.ADD_PARTS.ModalOverlay.getSelecter() + ', #modal-close').off().on('click', function() {
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
		});
	}

	/////////////////////////////
	// 非表示リスト
	/////////////////////////////

	/**
	 * 非表示リストを初期化
	 */
	function initializeDisableListDB() {
		if (DisableList != undefined) {
			if (!confirm('非表示リストを初期化しますか？')) {
				return;
			}
		}

		GM.setValue(UUJ.DB_NAMES.DISABLE_LIST, []);
		DisableList = [];
	}

	/**
	 * 非表示リストの読み込み
	 * @return {Array.<string>}
	 */
	function getDisableList() {
		if (DisableList === undefined) {
			initializeDisableListDB();
		}

		return DisableList;
	}

	/**
	 * 非表示リストの反映
	 * @param {Array.<string>} list 非表示リスト
	 */
	function setDisableList(list) {
		DisableList = list;
		GM.setValue(UUJ.DB_NAMES.DISABLE_LIST, list);
	}

	/**
	 * 非表示リストの追加
	 * @param {string} name 配信者名
	 */
	function addDisableList(name) {
		DisableList.push(name);

		setDisableList(DisableList);
	}

	/////////////////////////////
	// セクション非表示
	/////////////////////////////

	/**
	 * 非表示セクションデータベースを初期化
	 */
	function initializeDisableSectionDB() {
		if (DisableSection != undefined) {
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

		GM.setValue(UUJ.DB_NAMES.DISABLE_SECTION, dsInitial);
		DisableSection = dsInitial;
	}

	/**
	 * 非表示セクションの読み込み
	 * @return {Array.<string,boolean>} 非表示セクション
	 */
	function getDisableSection() {
		if (DisableSection === undefined) {
			initializeDisableSectionDB();
		}

		return DisableSection;
	}

	/**
	 * 非表示セクションを保存
	 * @param {string} section セクション名
	 * @param {boolean} bool trueで非表示
	 */
	function setDisableSection(section, bool) {
		let ds = getDisableSection();
		ds[section] = bool;

		DisableSection = ds;
		GM.setValue(UUJ.DB_NAMES.DISABLE_SECTION, ds);
		updateDisableSection();
	}

	/**
	 * 非表示セクションを更新
	 */
	function updateDisableSection() {
		// セクション
		$(UUJ.MODAL_WINDOW.rightPane.disableSection.sections.firstList.selecter).toggle(!getDisableSection()[UUJ.DB_NAMES.FIRST_LIST]);

		$(UUJ.MODAL_WINDOW.rightPane.disableSection.sections.secondList.selecter).toggle(!getDisableSection()[UUJ.DB_NAMES.SECOND_LIST]);

		$(UUJ.MODAL_WINDOW.rightPane.disableSection.sections.other.selecter).toggle(!getDisableSection()[UUJ.DB_NAMES.OTHER]);
		// ボタンテキストを変更
		$(UUJ.ADD_PARTS.OtherToggleButton.getSelecter()).val(getDisableSection()[UUJ.DB_NAMES.OTHER] ? UUJ.ADD_PARTS.OtherToggleButton.openLabel : UUJ.ADD_PARTS.OtherToggleButton.closeLabel);

		// イベントバー
		$('.ticker').insertBefore('.noblk:first');
		$(UUJ.MODAL_WINDOW.rightPane.disableSection.other.eventTicker.selecter).toggle(!getDisableSection()[UUJ.DB_NAMES.OTHER]);
	}

	/**
	 * セクションの表示を切り替え
	 * @param {string} section セクション名
	 */
	function toggleSection(section) {
		let ds = getDisableSection();

		switch (section) {
			case UUJ.DB_NAMES.FIRST_LIST:
				ds[UUJ.DB_NAMES.FIRST_LIST] = !ds[UUJ.DB_NAMES.FIRST_LIST];
				break;
			case UUJ.DB_NAMES.SECOND_LIST:
				ds[UUJ.DB_NAMES.SECOND_LIST] = !ds[UUJ.DB_NAMES.SECOND_LIST];
				break;
			case UUJ.DB_NAMES.OTHER:
				ds[UUJ.DB_NAMES.OTHER] = !ds[UUJ.DB_NAMES.OTHER];
				break;
			case UUJ.DB_NAMES.EVENT_TICKER:
				ds[UUJ.DB_NAMES.EVENT_TICKER] = !ds[UUJ.DB_NAMES.EVENT_TICKER];
				break;
		}

		DisableSection = ds;
		GM.setValue(UUJ.DB_NAMES.DISABLE_SECTION, ds);
		updateDisableSection();
	}

	/////////////////////////////
	// お気に入り
	/////////////////////////////

	/**
	 * お気に入りリストを初期化
	 */
	function initializeFavoriteListDB() {
		if (FavoriteList != undefined) {
			if (!confirm('お気に入りリストを初期化しますか？')) {
				return;
			}
		}

		GM.setValue(UUJ.DB_NAMES.FAVORITE_LIST, []);
		FavoriteList = [];
	}

	/**
	 * お気に入りリストの取得
	 * @return {Array.<string>} お気に入りリスト
	 */
	function getFavoriteList() {
		if (FavoriteList === undefined) {
			initializeFavoriteListDB();
		}

		return FavoriteList;
	}

	/**
	 * お気に入りリストを保存
	 * @param {Array.<string>} list お気に入りリスト
	 */
	function setFavoriteList(list) {
		FavoriteList = list;
		GM.setValue(UUJ.DB_NAMES.FAVORITE_LIST, list);
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
		if ($(row).parents('table').attr('id') === 'secondList') {
			// 配信サイトの画像を一次用に変更
			$(row).find('td.status a > img').attr('src', function() {
				return $(this).attr('src').replace(/_s/g, '');
			});

			// 視聴者数
			$(row).find('.viewers').html(
				'<span class="viewersNum">' + $(row).find('.viewers').text() + '</span>'
			);

			// 経過時間と開始時間を結合
			let dur = $(row).find('span.duration').prop('outerHTML');
			let date = $(row).find('span.date').prop('outerHTML');
			$(row).find('td.lastDate').html(dur + '<br>' + date);
			$(row).find('td.duration').remove();
		}

		// 移動
		$(row).removeClass('invisible').removeClass('hidden_offline').addClass('favorite').insertBefore($('#firstList tr').not('.favorite').eq(1));
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
		$(row).removeClass('favorite').insertBefore($('#firstList tr.offline:not(.favorite)').first());
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

		// 終了時間
		// 先頭の波を削除
		let end = date.replace(/^～/, '');
		// Dateに変換
		end = new Date(now.getFullYear(),
			('0' + date.match(/\d+/)).slice(-2) - 1,
			('0' + date.match(/\d+(?=\s)/)).slice(-2),
			date.match(/\d+(?=:)/),
			date.match(/\d+$/),
			0);

		// 時間差(秒)
		let time = (now.getTime() - end) / 1000;
		// 年跨ぎ
		if (time < 0) {
			time = 31536000 + time;
		}

		// ミリ秒から時間へ変換
		if ((time / 60) < 60) {
			// 60分以内
			return '～' + Math.floor(time / 60) + '分前';
		} else if ((time / 3600) < 24) {
			// 24時間以内
			return '～' + Math.floor(time / 3600) + '時間前';
		} else if ((time / 86400) < 360) {
			// 360日以内
			return '～' + Math.floor(time / 86400) + '日前';
		} else {
			// 1年以上
			return '～1年以上前';
		}
	}

	/////////////////////////////
	// 並び替え
	/////////////////////////////

	/**
	 * テーブル並び替え設定を初期化
	 */
	function initializeTableOrderDB() {
		if (TableOrder != undefined) {
			if (!confirm('並び替えを初期化しますか？')) {
				return;
			}
		}

		GM.setValue(UUJ.DB_NAMES.TABLE_ORDER, UUJ.MODAL_WINDOW.rightPane.tableOrder.default.tableOrder);
		TableOrder = UUJ.MODAL_WINDOW.rightPane.tableOrder.default.tableOrder;
	}

	/**
	 * テーブル並び替え設定を取得
	 * @return {string} テーブル並び替え設定
	 */
	function getTableOrder() {
		if (TableOrder === undefined) {
			initializeTableOrderDB();
		}

		return TableOrder;
	}

	/**
	 * テーブル並び替え設定を設定
	 * @param {string} order テーブル並び替え設定
	 */
	function setTableOrder(order) {
		TableOrder = order;
		GM.setValue(UUJ.DB_NAMES.TABLE_ORDER, TableOrder);
		updateTableOrder(false);
	}

	/**
	 * テーブルのソート順を更新
	 * @param {boolean} firstFlag 初期更新かどうか
	 */
	function updateTableOrder(firstFlag = true) {
		if (firstFlag) {
			// チェックボックスを更新
			$(UUJ.MODAL_WINDOW.rightPane.tableOrder[getTableOrder()].getSelecter('id')).prop('checked', true);
			// オーダー実行
			UUJ.MODAL_WINDOW.rightPane.tableOrder[getTableOrder()].execute();
		} else {
			if (confirm('ページを更新します')) {
				location.reload();
			}
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
		return $(button).prevAll('a[href]').first().text().replace(/\r?\n/g, '');
	}

	// /**
	//  * お気に入りボタンから配信者名を取得
	//  * @param {Object} favoriteMark お気に入りボタン
	//  * @return {string} 配信者名
	//  */
	// function nameFromFavoriteButton(favoriteMark) {
	// 	return $(favoriteMark).prev().text().replace(/\r?\n/g, '');
	// }

	/**
	 * ボタンのあるテーブルの行を削除
	 * @param {Object} button ボタン
	 */
	function deleteRow(button) {
		$(button).parent().parent().remove();
	}

	/////////////////////////////
	// サムネイル設定
	/////////////////////////////

	/**
	 * サムネイル設定を初期化
	 */
	function initializeThumbnailSetting() {
		if (ThumbnailSetting != undefined) {
			if (!confirm('サムネイル設定を初期化しますか？')) {
				return;
			}
		}

		let tsInitial = {
			mode: UUJ.MODAL_WINDOW.rightPane.thumbnail.mode.default.mode,
			keepAspect: true,
			width: 50,
			height: 50,
		};

		GM.setValue(UUJ.DB_NAMES.THUMBNAIL_SETTING, tsInitial);
		ThumbnailSetting = tsInitial;
	}

	/**
	 * サムネイル設定を取得
	 * @return {Object} サムネイル設定
	 */
	function getThumbnailSetting() {
		if (ThumbnailSetting === undefined) {
			initializeThumbnailSetting();
		}

		return ThumbnailSetting;
	}

	/**
	 * サムネイル設定を保存
	 * @param {Object} setting サムネイル設定
	 */
	function setThumbnailSetting(setting) {
		ThumbnailSetting = setting;
		GM.setValue(UUJ.DB_NAMES.THUMBNAIL_SETTING, setting);
		updateThumbnailSetting(false);
	}

	/**
	 * サムネイル表示を更新
	 * @param {boolean} firstFlag 初期か
	 */
	function updateThumbnailSetting(firstFlag = true) {
		if (firstFlag) {
			let ts = getThumbnailSetting();
			// モードを適用
			UUJ.MODAL_WINDOW.rightPane.thumbnail.mode[ts.mode].execute();

			// CSS 横指定
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
				addStyle(style);
			}

			// モーダルウィンドウ内に反映
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.mode[ts.mode].getSelecter('id')).prop('checked', true);
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.getSelecter()).toggle((ts.mode === UUJ.MODAL_WINDOW.rightPane.thumbnail.mode.default.mode) ? false : true);
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.keepAspect.item.getSelecter('id')).prop('checked', ts.keepAspect);
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.width.item.getSelecter('id')).val(ts.width);
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.height.item.getSelecter('id')).val(ts.height);


			if (ts.keepAspect) {
				$('img' + UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.item.image.getSelecter('class')).attr('width', ts.width).removeAttr('height').next().text(ts.width + 'px : ' + 'auto');
			} else {
				$('img' + UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.item.image.getSelecter('class')).attr('width', ts.width).attr('height', ts.height).next().text(ts.width + 'px : ' + ts.height + 'px');
			}
			$(UUJ.MODAL_WINDOW.rightPane.thumbnail.size.setting.height.getSelecter('id')).toggle(!ts.keepAspect);

			$('div' + UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.item.image.getSelecter('class')).css({
				'width': ts.width,
				'height': ts.width * 0.5625 + 30 + 'px',
			});

			// サンプル画像を設定
			$('img' + UUJ.MODAL_WINDOW.rightPane.thumbnail.size.sampleImage.item.image.getSelecter()).attr('src', function() {
				if ($('img[onmouseover]').length) {
					return $('img[onmouseover]').first().attr('onmouseover').split('\'')[1];
				} else {
					return $('img.r').first().attr('src');
				}
			});
		} else {
			if (confirm('ページを更新します')) {
				location.reload();
			}
		}
	}

	/////////////////////////////
	// その他の設定
	/////////////////////////////

	/**
	 * その他の設定を初期化
	 */
	function initializeMiscSettingDB() {
		// 存在しない場合
		if (MiscSetting != undefined) {
			if (!confirm('その他の設定を初期化しますか？')) {
				return;
			}
		}

		// 初期設定を生成
		let initial = {};
		Object.keys(UUJ.MODAL_WINDOW.rightPane.misc).forEach(function(key) {
			if (typeof this[key] === 'object' && this[key].type === undefined) {
				Object.keys(this[key]).forEach(function(key) {
					if (typeof this[key] === 'object' && key !== 'title') {
						initial[key] = false;
					}
				}, this[key]);
			}
		}, UUJ.MODAL_WINDOW.rightPane.misc);

		GM.setValue(UUJ.DB_NAMES.MISC_SETTING, initial);
		MiscSetting = initial;
	}

	/**
	 * その他の設定を取得
	 * @return {object} その他の設定
	 */
	function getMiscSetting() {
		if (MiscSetting === undefined) {
			initializeMiscSettingDB();
		}

		return MiscSetting;
	}

	/**
	 * その他の設定を設定
	 * @param {object} setting その他の設定
	 */
	function setMiscSetting(setting) {
		MiscSetting = setting;
		GM.setValue(UUJ.DB_NAMES.MISC_SETTING, setting);
	}

	/**
	 * その他の設定を更新
	 * @param {boolean} [firstFlag=true] 初期かどうか
	 */
	function updateMiscSetting(firstFlag = true) {
		if (firstFlag) {
			Object.keys(UUJ.MODAL_WINDOW.rightPane.misc).forEach(function(key) {
				if (typeof this[key] === 'object' && this[key].type === undefined) {
					Object.keys(this[key]).forEach(function(key) {
						if (typeof this[key] === 'object' && key !== 'title') {
							if (getMiscSetting()[key]) {
								this[key].execute();
							}
						}
					}, this[key]);
				}
			}, UUJ.MODAL_WINDOW.rightPane.misc);
		} else {
			if (confirm('ページを更新します')) {
				location.reload();
			}
		}
	}

	/////////////////////////////
	// その他の関数
	/////////////////////////////

	/**
	 * addStyle
	 * @param {string} css css
	 */
	function addStyle(css) {
		let head = document.getElementsByTagName('head')[0];
		if (head) {
			let style = document.createElement('style');
			style.setAttribute('type', 'text/css');
			style.textContent = css;
			head.appendChild(style);
		}
	}

	/**
	 * objectからタグを生成する
	 * @param {object} object オブジェクト
	 * @return {string} タグ
	 */
	function generateTagFromObject(object) {
		let tag;
		switch (object.type) {
			case 'title':
				tag = '<h3>' + object.value + '</h3>';
				break;
			case 'info':
				tag = '<p class="' + object.class + '">' + object.value + '</p>';
				break;
			case 'button':
				tag = '<input type="button" class="' + object.class + '" id="' + object.id + '" value="' + object.value + '">';
				break;
			case 'checkbox':
				tag = '<input type="checkbox" class="' + object.class + '" id="' + object.id + '"><label for="' + object.id + '">' + object.label + '</label>';
				break;
			case 'radio':
				tag = '<input type="radio" class="' + object.class + '" id="' + object.id + '" name="' + object.name + '"><label for="' + object.id + '">' + object.label + '</label>';
				break;
			case 'number':
				tag = object.beforeLabel + '<input type="number" class="' + object.class + '" id="' + object.id + '" value="150" min="50">' + object.afterLabel;
				break;
			case 'textarea':
				tag = '<textarea value="" id="' + object.id + '" rows="5" style="width:100%; max-width:100%; min-width:100%;" wrap="hard"></textarea>';
				break;
			case 'image':
				tag = '<img class="' + object.class + '" alt="' + object.alt + '" width="150px" height="150px" src="./img/ust_s.png">';
				break;
			case 'figcaption':
				tag = '<figcaption>' + object.value + '</figcaption>';
				break;
			case 'link':
				tag = '<a class="' + object.class + '" title="' + object.label + '">' + object.value + '</a>';
				break;
			default:
				tag = undefined;
				break;
		}

		// 改行
		if (object.linefeed) {
			tag += '<br>';
		}

		return tag;
	}

	/**
	 * 文字列の先頭を小文字にする
	 *
	 * @param {string} string
	 * @return {string}
	 */
	function lowerCaseFirst(string) {
		return string.charAt(0).toLowerCase() + string.slice(1);
	}

	/**
	 * debug
	 */
	function debug() {
		// debug
	}
})();
