/* 
    Quick-n-dirty demo page for Sudoku.js.

    For more information, please see https://github.com/robatron/sudoku.js
*/

// Selectors
var BOARD_SEL = "#sudoku-board";
var NUMBERS_SEL = "#sudoku-numbers";
var TABS_SEL = "#generator-tabs";
var MESSAGE_SEL = "#message";
var PUZZLE_CONTROLS_SEL = "#puzzle-controls";
var IMPORT_CONTROLS_SEL = "#import-controls";
var SOLVER_CONTROLS_SEL = "#solver-controls";

// Global Vars
var SUDOKU, SOLVED, RECORD = { Score: 0, Start: 0, End: 0, };
var FAILED = false, MUTE = false, LABELED = false;

// Levels
var LEVEL = {
    easy: "easy",
    medium: "medium",
    hard: "hard",
    "very-hard": "very-hard",
    insane: "insane",
    inhuman: "inhuman",
    import: "import",
};
// Boards
// TODO: Cache puzzles as strings instead of grids to cut down on conversions?
var boards = {
    [LEVEL.easy]: null,
    [LEVEL.medium]: null,
    [LEVEL.hard]: null,
    [LEVEL["very-hard"]]: null,
    [LEVEL.insane]: null,
    [LEVEL.inhuman]: null,
    [LEVEL.import]: null,
};

var build_board = function () {
    /* Build the Sudoku board markup
    
    TODO: Hardcode the result
    */
    for (var r = 0; r < 9; ++r) {
        var $row = $("<tr/>", {});
        for (var c = 0; c < 9; ++c) {
            var $square = $("<td/>", {});
            if (c % 3 == 2 && c != 8) {
                $square.addClass("border-right");
            }
            $square.append(
                // $("<input/>", {
                $("<div/>", {
                    id: "row" + r + "-col" + c,
                    class: "square",
                    // maxlength: "9",
                    // type: "text",
                })
            );
            $row.append($square);
        }
        if (r % 3 == 2 && r != 8) {
            $row.addClass("border-bottom");
        }
        $(BOARD_SEL).append($row);
    }
};

var init_board = function () {
    /* Initialize board interactions
     */
    // $(BOARD_SEL + " input.square").change(function(){
    $(BOARD_SEL + " div.square").change(function () {
        return false;
        /* Resize font size in each square depending on how many characters are
        in it.
        */
        var $square = $(this);
        var nr_digits = $square.val().length;
        var font_size = "40px";
        if (nr_digits === 3) {
            font_size = "35px";
        } else if (nr_digits === 4) {
            font_size = "25px";
        } else if (nr_digits === 5) {
            font_size = "20px";
        } else if (nr_digits === 6) {
            font_size = "17px";
        } else if (nr_digits === 7) {
            font_size = "14px";
        } else if (nr_digits === 8) {
            font_size = "13px";
        } else if (nr_digits >= 9) {
            font_size = "11px";
        }
        $(this).css("font-size", font_size);
    });
    // $(BOARD_SEL + " input.square").keyup(function(){
    //     /* Fire a change event on keyup, enforce digits
    //     */
    //     $(this).change();
    // });
};

var init_tabs = function () {
    /* Initialize the Sudoku generator tabs
     */
    $(TABS_SEL + " a").click(function (e) {
        e.preventDefault();
        !MUTE && SOUND.click?.play();


        var $t = $(this);
        var t_name = $t.attr("id");

        // Hide any error messages
        $(MESSAGE_SEL).hide();

        // If it's the import tab
        if (t_name === "import") {
            $(PUZZLE_CONTROLS_SEL).hide();
            $(IMPORT_CONTROLS_SEL).show();

            // Otherwise it's a normal difficulty tab
        } else {
            $(PUZZLE_CONTROLS_SEL).show();
            $(IMPORT_CONTROLS_SEL).hide();
        }
        // show_puzzle(t_name);
        $t.tab("show");
        refresh();
    });
};

var init_controls = function () {
    /* Initialize the controls */
    $(NUMBERS_SEL + " div").click((e) => {
        check_in(e.target);
    });

    // Puzzle controls
    $(PUZZLE_CONTROLS_SEL + " #refresh").click(function (e) {
        /* Refresh the current puzzle
         */
        e.preventDefault();
        refresh();
    });

    $(PUZZLE_CONTROLS_SEL + " #label-puzzle").click(function (e) {
        /* Label the current puzzle */
        LABELED = !LABELED;
        e.preventDefault();
        !MUTE && SOUND.labeled?.play();
        $(e.target).toggleClass("btn-off");
        $(NUMBERS_SEL + ' div').toggleClass('labeled');
        if (!LABELED) $(NUMBERS_SEL + ' div.select').removeClass('select');
    });

    $(PUZZLE_CONTROLS_SEL + " #btn-sound").click(function (e) {
        /* Sound control */
        MUTE = !MUTE;
        e.preventDefault();
        SOUND.labeled?.play();
        $(e.target).toggleClass("btn-mute");
    });

    // Import controls
    $(IMPORT_CONTROLS_SEL + " #import-string").change(function () {
        /* Update the board to reflect the import string
         */
        var import_val = $(this).val();
        var processed_board = "";
        for (var i = 0; i < 81; ++i) {
            if (
                typeof import_val[i] !== "undefined" &&
                (sudoku._in(import_val[i], sudoku.DIGITS) ||
                    import_val[i] === sudoku.BLANK_CHAR)
            ) {
                processed_board += import_val[i];
            } else {
                processed_board += sudoku.BLANK_CHAR;
            }
        }
        // boards["import"] = sudoku.board_string_to_grid(processed_board);
        boards[LEVEL.import] = sudoku.board_string_to_grid(processed_board);
        // show_puzzle("import");
        show_puzzle(LEVEL.import);
    });
    $(IMPORT_CONTROLS_SEL + " #import-string").keyup(function () {
        /* Fire a change event on keyup, enforce digits
         */
        $(this).change();
    });

    // Solver controls
    $(SOLVER_CONTROLS_SEL + " #solve").click(function (e) {
        /* Solve the current puzzle
         */
        e.preventDefault();
        solve_puzzle(get_tab());
    });

    $(SOLVER_CONTROLS_SEL + " #get-candidates").click(function (e) {
        /* Get candidates for the current puzzle
         */
        e.preventDefault();
        const button = $(e.target);
        if (button.text().indexOf("Show") != -1) {
            get_candidates(get_tab());
            button.text("Hide candidates");
        } else {
            button.text("Show candidates");
        }
    });

    $(SOLVER_CONTROLS_SEL + " #test-sounds").click(function (e) {
        /* Get candidates for the current puzzle
         */
        e.preventDefault();
        // console.log(isAudioPlaying)
        if (isAudioPlaying(SOUND.success)) SOUND.success.stop();

        !MUTE && SOUND.success.play();
    });
};

var refresh = () => {
    !MUTE && SOUND.refresh?.play();
    FAILED = false;
    LABELED = false;
    error_counter(0);
    $(BOARD_SEL + ' div.mark').remove();
    // $(NUMBERS_SEL + ' div').removeClass('labeled').removeClass('select').removeClass('hidden');
    $(NUMBERS_SEL + ' div').removeClass('labeled select hidden');

    var tab_name = get_tab();
    // if(tab_name !== "import"){
    if (tab_name !== LEVEL.import) {
        show_puzzle(tab_name, true);
    }
}

var init_message = function () {
    /* Initialize the message bar
     */

    //Hide initially
    $(MESSAGE_SEL).hide();
};

var getCss = function (el) {
    var style = window.getComputedStyle(el);
    return Object.keys(style).reduce(function (acc, k) {
        var name = style[k],
            value = style.getPropertyValue(name);
        if (value !== null) {
            acc[name] = value;
        }
        return acc;
    }, {});
};

var select_all = (number) => { };

var normalization = (x) => {
    var min_x = 50, max_x = 900;       // old range
    var new_min = 300, new_max = 600; // new range
    var x_new = (x - min_x) / (max_x - min_x) * (new_max - new_min) + new_min
    return parseInt(x_new)
}

var check_in = (elem) => {
    if (FAILED) return;
    !MUTE && SOUND.click.play();
    let selected = $(BOARD_SEL + " .selected");
    let elem_number = $(elem).text();
    if (selected.length) {
        const selected_number = selected.first().text();
        const match = selected.first().attr('id').match(/\d+/ig)
        const index = parseInt(match[0]) * 9 + parseInt(match[1])
        // console.log(`index=[${match[0]} x 9 + ${match[1]}] = ${index}`)
        // console.log(`select= ${selected_number}, check in= ${elem_number}, solved= ${SOLVED[index]}`)
        if (elem_number == selected_number) {
        } else if (selected_number == "") {
            const first = selected.first();
            if (LABELED) {
                // mark a block
                var mark = first.parent().find('.mark');
                if (mark.length) {
                } else {
                    // create and insert div.mark before elem
                    mark = $('<div class="mark" />')
                    mark.insertBefore(first);
                    mark.on('DOMSubtreeModified', e => {
                        marker_change(e);
                    })
                }
                const _i = mark.find(`i:contains('${elem_number}')`)
                if (_i.length) {
                    // if exist, remove number from dir.mark
                    _i.remove()
                } else {
                    // add number into dir.mark
                    $('<i>' + elem_number + '</i>').appendTo(mark);
                    let list = mark.find('i');
                    if (list.length > 1) {
                        // console.log(list)
                        mark.html(list.sort((a, b) => parseInt(a.innerText) - parseInt(b.innerText)));
                    }
                }
                return;
            }
            // check in
            const { top, left } = first.offset();
            const { top: top0, left: left0 } = $(elem).offset();
            const clone = $(elem).clone();
            const distance = Math.sqrt(Math.pow(top0 - top, 2) + Math.pow(left0 - left, 2));
            const timeout = normalization(distance)
            const correct = parseInt(elem_number) == parseInt(SOLVED[index])
            // console.log(elem_number, SOLVED[index], correct)
            clone
                .addClass("fly-block")
                .appendTo("body")
                .css({
                    left: left0 + "px",
                    top: top0 + "px",
                })
                .animate(
                    {
                        left: left + "px",
                        top: top + "px",
                    },
                    timeout,
                    () => {
                        if (correct) {
                            clone.fadeOut(100, () => {
                                clone.remove()
                            });
                            first.text(elem_number).addClass('checked');
                            first.parent().find('.mark').remove();
                            check_all_in(first);
                        } else {
                            !MUTE && SOUND.error?.play();
                            error_counter(1);
                            clone.animate({
                                left: left0 + "px",
                                top: top0 + "px",
                            }, timeout, () => {
                                clone.fadeOut(100, () => {
                                    clone.remove()
                                });
                            })
                        }
                        // console.log('finished')
                    }
                );
        } else {
            selected.removeClass("selected");
            $(BOARD_SEL + " div.square").each((i, k) => {
                const txt = $(k).text();
                if (parseInt(txt) == parseInt(elem_number)) {
                    setTimeout(() => {
                        $(k).addClass("selected");
                    }, 50)
                }
            });
        }
    } else {
        $(BOARD_SEL + " div.square").each((i, k) => {
            const txt = $(k).text();
            if (txt == elem_number) {
                // console.log($(k).text());
                $(k).addClass("selected");
            }
        });
    }
};

var marker_change = (event) => {
    const marker = $(event.target)
    const list = marker.find('i');
    $(NUMBERS_SEL + ' div.select').removeClass('select')
    if (list.length) {
        list.each((i, k) => {
            $(NUMBERS_SEL + ' div:contains(' + k.innerText + ')')
                .addClass('select')
        })
    } else {
        // empty
    }

}

var check_all_in = (elem) => {
    remove_marks(elem);
    const empty = $(BOARD_SEL + ' div.square').filter((i, k) => k.innerText.length == 0)
    if (empty.length == 0 && FAILED == false) {
        SOUND.success?.play();
        $('#dialog').modal('show');
        $('#dialog .modal-body').html(`<div>
        <p>
            <img src='./assets/img/success.png' />
        </p>
        <h1 class='green-text'>SUCCESS !</h1>
        </div>`)
        $('#dialog .modal-footer .btn-primary').click(e => {
            refresh();
            $('#dialog').modal('hide');
        })
    }
}

var remove_marks = elem => {
    const text = elem.text();
    const rowcol = elem.attr('id').match(/\d+/ig)
    const row = parseInt(rowcol[0]);
    const col = parseInt(rowcol[1]);
    const regex = new RegExp(`row${row}\\-col\\d|row\\d\\-col${col}`);
    const list = $(BOARD_SEL + ` div.square`)
        .filter((i, k) => k.id != `row${row}-col${col}`
            && regex.test(k.id));

    // remove <i/> in div.mark
    list?.each((i, k) => {
        $(k).siblings('.mark')?.find('i:contains(' + text + ')')?.remove();
    })

    //disable number controls
    if ($(BOARD_SEL + ' div.square:contains(' + text + ')').length == 9)
        $(NUMBERS_SEL + ' div:contains(' + text + ')').addClass('hidden');

}

var solve_puzzle = function (puzzle) {
    /* Solve the specified puzzle and show it */

    // Solve only if it's a valid puzzle
    if (typeof boards[puzzle] !== "undefined") {
        display_puzzle(boards[puzzle], true);

        var error = false;
        try {
            var solved_board = sudoku.solve(
                sudoku.board_grid_to_string(boards[puzzle])
            );
        } catch (e) {
            error = true;
        }

        // Display the solved puzzle if solved successfully, display error if
        // unable to solve.
        if (solved_board && !error) {
            display_puzzle(sudoku.board_string_to_grid(solved_board), true);
            $(MESSAGE_SEL).hide();
        } else {
            $(MESSAGE_SEL + " #text").html(
                "<strong>Unable to solve!</strong> " +
                "Check puzzle and try again."
            );
            $(MESSAGE_SEL).show();
        }
    }
};

var get_candidates = function (puzzle) {
    /* Get the candidates for the specified puzzle and show it
     */

    // Get candidates only if it's a valid puzzle
    if (typeof boards[puzzle] !== "undefined") {
        display_puzzle(boards[puzzle], true);

        var error = false;
        try {
            var candidates = sudoku.get_candidates(
                sudoku.board_grid_to_string(boards[puzzle])
            );
        } catch (e) {
            error = true;
        }

        // Display the candidates if solved successfully, display error if
        // unable to solve.
        if (candidates && !error) {
            display_puzzle(candidates, true);
            $(MESSAGE_SEL).hide();
        } else {
            $(MESSAGE_SEL + " #text").html(
                "<strong>Unable to display candidates!</strong> " +
                "Contradictions encountered. Check puzzle and try again."
            );
            $(MESSAGE_SEL).show();
        }
    }
};

var show_puzzle = function (puzzle, refresh) {
    /* Show the puzzle of the specified puzzle. If the board has not been
    generated yet, generate a new one and save. Optionally, set `refresh` to 
    force a refresh of the specified puzzle.
    */

    // default refresh to false
    refresh = refresh || false;

    // If not a valid puzzle, default -> "easy"
    if (typeof boards[puzzle] === "undefined") {
        // puzzle = "easy";
        // puzzle = levels.easy;
        puzzle = LEVEL.inhuman;
    }

    // If the board at the specified puzzle doesn't exist yet, or `refresh`
    // is set, generate a new one
    if (boards[puzzle] === null || refresh) {
        // if(puzzle === "import"){
        if (puzzle === LEVEL.import) {
            boards[puzzle] = sudoku.board_string_to_grid(sudoku.BLANK_BOARD);
        } else {
            SUDOKU = sudoku.generate(puzzle);
            boards[puzzle] = sudoku.board_string_to_grid(SUDOKU);
            SOLVED = sudoku.solve(SUDOKU)
            // console.log(SUDOKU);
            // console.log(SOLVED);
        }

        // console.log(boards[puzzle]);
    }

    // Display the puzzle
    display_puzzle(boards[puzzle]);
};

var display_puzzle = function (board, highlight) {
    /* Display a Sudoku puzzle on the board, optionally highlighting the new
    values, with green if `highlight` is set. Additionally do not disable the
    new value squares.
    */
    $(BOARD_SEL + " div.selected").removeClass("selected");

    for (var r = 0; r < 9; ++r) {
        for (var c = 0; c < 9; ++c) {
            // var $square = $(BOARD_SEL + " input#row" + r + "-col" + c);
            var $square = $(BOARD_SEL + " div#row" + r + "-col" + c);
            $square.removeClass("green-text");
            // $square.attr("disabled", "disabled");
            $square.removeAttr("disabled");
            if (board[r][c] != sudoku.BLANK_CHAR) {
                var board_val = board[r][c];
                var square_val = $square.text();
                if (highlight && board_val != square_val) {
                    $square.addClass("green-text");
                } else {
                    // $square.attr("disabled", "disabled");
                    $square.addClass('checked')
                }
                // $square.val(board_val);
                $square.text(board_val);
            } else {
                // $square.val('');
                $square.text("");
            }
            // Fire off a change event on the square
            $square.change().click((e) => {
                cell_click($(e.target));
                // e.preventDefault();
            });
        }
    }

    // disable number controls
    const dic = SUDOKU.match(/\d/g).reduce(function (accumulator, currentValue) {
        accumulator[currentValue] = ++accumulator[currentValue] || 1
        return accumulator
    }, {})

    // console.log(Object.keys(dic).filter(k => dic[k] == 9))
    Object.keys(dic).filter(k => dic[k] == 9)?.forEach(k => {
        $(NUMBERS_SEL + ' div:contains(' + k + ')').addClass('hidden');
    })
};

var cell_click = (elem) => {
    if (FAILED) return;
    !MUTE && SOUND.click.play();
    const text = elem.text();
    const selected = elem.hasClass("selected");
    $(BOARD_SEL + " div.selected").removeClass("selected");

    if (selected) {
        $(BOARD_SEL + " div.square").each((k) => {
            // console.log($(k).text())
        });
    } else {
        if (text) {
            setTimeout(() => {
                $(BOARD_SEL + " div.square:contains('" + text + "')").addClass('selected')
            }, 50)
            LABELED && $(NUMBERS_SEL + ' .select').removeClass('select');
        } else {
            setTimeout(() => {
                elem.addClass("selected");
            }, 10)

            $(NUMBERS_SEL + ' .select').removeClass('select');

            if (elem.siblings('.mark').length > 0 && LABELED) {
                // $(NUMBERS_SEL + ' .select').removeClass('select');
                const list = elem.siblings('.mark').find('i');
                list?.each((i, k) => $(NUMBERS_SEL + ' div:contains(' + k.innerText + ')').addClass('select'))
            }

            // const match = elem.first().attr('id').match(/\d+/ig);
            // const index = parseInt(match[0]) * 9 + parseInt(match[1]);
            // console.log(index, 'solved=', SOLVED[index])
        }
    }
};

var error_counter = (count = 1) => {
    //0: init or refresh
    //1: add 1 until 4 quit
    let total = $('#error-counter i');
    if (count == 0) {
        total.remove();
        $(MESSAGE_SEL).hide();
        return;
    } else if (total.length + 1 > 3) {
        FAILED = true;
        $('<i>❌</i>').appendTo('#error-counter');
        !MUTE && SOUND.failed?.play();

        $(MESSAGE_SEL).show().find('#text').html(
            "<strong>4 This round failed!</strong>"
        );
    } else {
        $('<i>❌</i>').appendTo('#error-counter');
    }
}

var get_tab = function () {
    /* Return the name of the currently-selected tab
     */
    return $(TABS_SEL + " li.active a").attr("id");
};

var click_tab = function (tab_name) {
    /* Click the specified tab by name
     */
    $(TABS_SEL + " #" + tab_name).click();
};

var SOUND = {
    click: new Audio("./assets/snd/click-6.mp3"),
    error: new Audio("./assets/snd/error-2.mp3"),
    failed: new Audio("./assets/snd/game-failed.mp3"),
    success: new Audio("./assets/snd/game-success.mp3"),
    invalid: new Audio("./assets/snd/invalid-1.mp3"),
    notice: new Audio("./assets/snd/notice-1.mp3"),
    entrance: new Audio("./assets/snd/game-passed.mp3"),
    newRecord: new Audio("./assets/snd/break-record.mp3"),
    refresh: new Audio("./assets/snd/click-5.mp3"),
    labeled: new Audio("./assets/snd/click-3.mp3"),
};

var isAudioPlaying = function (audio) {
    return (
        audio &&
        audio.currentTime > 0 &&
        !audio.paused &&
        !audio.ended &&
        audio.readyState > 2
    );
};

var init_sounds = () => {
    // sounds.entrance.play();
    // console.log("game entrance");
};

// "Main" (document ready)
$(function () {
    FAILED = false;
    LABELED = false;
    init_sounds();
    error_counter(0);
    build_board();
    init_board();
    init_tabs();
    init_controls();
    init_message();

    // Initialize tooltips
    $("[rel='tooltip']").tooltip();

    // Start with generating an easy puzzle
    // click_tab("easy");
    click_tab(LEVEL.easy);

    // Hide the loading screen, show the app
    $("#app-wrap").removeClass("hidden");
    $("#loading").addClass("hidden");
});
