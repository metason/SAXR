'use client';
/**
 * @module quiz/page
 * Self-test quiz. Reads multiple-choice questions from questions.json (a plain
 * data file that can be regenerated), shows one at a time with 4 answers,
 * gives instant feedback + an explanation, tracks score, and shuffles each run.
 */

import { useState } from 'react';
import Link from 'next/link';
import questionsData from './questions.json';

interface Question {
	q: string;
	choices: string[];
	answer: number;
	explain?: string;
}

const QUESTIONS = questionsData as Question[];

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export default function QuizPage() {
	const [order, setOrder] = useState<number[]>(() =>
		shuffle(QUESTIONS.map((_, i) => i)),
	);
	const [pos, setPos] = useState(0);
	const [selected, setSelected] = useState<number | null>(null);
	const [score, setScore] = useState(0);
	const [done, setDone] = useState(false);

	const q = QUESTIONS[order[pos]];
	const answered = selected !== null;

	function choose(i: number) {
		if (answered) return;
		setSelected(i);
		if (i === q.answer) setScore((s) => s + 1);
	}

	function next() {
		if (pos + 1 >= order.length) {
			setDone(true);
			return;
		}
		setPos((p) => p + 1);
		setSelected(null);
	}

	function restart() {
		setOrder(shuffle(QUESTIONS.map((_, i) => i)));
		setPos(0);
		setSelected(null);
		setScore(0);
		setDone(false);
	}

	return (
		<div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
			<div className="max-w-2xl mx-auto px-6 py-10">
				<Link
					href="/"
					className="text-sm text-white/50 hover:text-white transition"
				>
					← Examples
				</Link>

				<div className="flex items-center justify-between mt-6">
					<h1 className="text-2xl font-bold">Self-test</h1>
					<span className="text-sm text-white/60">
						Score {score} / {QUESTIONS.length}
					</span>
				</div>

				{done ? (
					<div className="mt-10 rounded-xl border border-white/10 bg-white/5 p-8 text-center">
						<div className="text-4xl font-bold">
							{score} / {QUESTIONS.length}
						</div>
						<p className="text-white/60 mt-2">
							{score === QUESTIONS.length
								? 'Perfect. You own this.'
								: score >= QUESTIONS.length * 0.7
									? 'Solid. Re-drill the ones you missed.'
									: 'Keep going — run it again.'}
						</p>
						<button
							onClick={restart}
							className="mt-6 px-4 py-2 rounded-lg bg-violet-500/80 hover:bg-violet-500 transition font-medium"
						>
							Restart (reshuffle)
						</button>
					</div>
				) : (
					<>
						<div className="mt-2 text-xs text-white/40">
							Question {pos + 1} of {order.length}
						</div>

						<div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-6">
							<p className="text-lg font-semibold leading-relaxed">{q.q}</p>

							<div className="mt-5 flex flex-col gap-2">
								{q.choices.map((choice, i) => {
									const isCorrect = i === q.answer;
									const isChosen = i === selected;
									let cls =
										'border-white/10 bg-white/5 hover:bg-white/10';
									if (answered) {
										if (isCorrect)
											cls = 'border-emerald-400 bg-emerald-400/15';
										else if (isChosen)
											cls = 'border-red-400 bg-red-400/15';
										else cls = 'border-white/10 bg-white/5 opacity-50';
									}
									return (
										<button
											key={i}
											onClick={() => choose(i)}
											disabled={answered}
											className={`text-left rounded-lg border p-3 transition flex gap-3 ${cls}`}
										>
											<span className="font-mono text-white/50">
												{LETTERS[i]}
											</span>
											<span>{choice}</span>
										</button>
									);
								})}
							</div>

							{answered && q.explain && (
								<div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-white/80 leading-relaxed">
									<span
										className={
											selected === q.answer
												? 'text-emerald-300 font-semibold'
												: 'text-red-300 font-semibold'
										}
									>
										{selected === q.answer ? 'Correct. ' : 'Not quite. '}
									</span>
									{q.explain}
								</div>
							)}

							{answered && (
								<button
									onClick={next}
									className="mt-5 px-4 py-2 rounded-lg bg-violet-500/80 hover:bg-violet-500 transition font-medium"
								>
									{pos + 1 >= order.length ? 'See score' : 'Next →'}
								</button>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
