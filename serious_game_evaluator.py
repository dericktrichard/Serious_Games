"""
Serious Game Diagnostic Framework
Implements the analytical framework from the seminar presentation:
"Serious Games as Tools for Real-World Problem Solving"

Group 24 | Objectives 1 & 2
"""

class SeriousGameEvaluator:
    """
    Evaluates educational technology products using the design-logic framework
    that distinguishes Serious Games from Gamification.
    """

    def __init__(self):
        self.criteria = {
            "design_logic": {
                "question": "Do learning objectives drive the core game mechanics, or do reward mechanics (points, badges, stars) drive engagement?",
                "serious_game": "Learning objectives are inseparable from gameplay (e.g., algebra IS the puzzle, physics IS the building)",
                "gamification": "Game elements (points, badges, leaderboards) are added on top of traditional content",
                "weight": 1.25
            },
            "cognitive_demand": {
                "question": "Does the game require sustained deep cognitive investment, or surface-level interaction?",
                "serious_game": "Deep, immersive interaction requiring problem-solving, strategy, and systems thinking",
                "gamification": "Surface-level engagement: tap, select, repeat with minimal cognitive load",
                "weight": 1.0
            },
            "failure_function": {
                "question": "What happens when the player fails?",
                "serious_game": "Failure is productive: feedback reveals why the concept was wrong, encouraging persistence",
                "gamification": "Failure is penalizing: loss of points, lives, or progress without conceptual explanation",
                "weight": 1.25
            },
            "learning_depth": {
                "question": "Is knowledge embedded within the systemic interaction, or layered as motivation atop instruction?",
                "serious_game": "Knowledge is embedded in the system: you cannot succeed without understanding the concept",
                "gamification": "Content exists independently; game is a motivation layer (chocolate-covered broccoli)",
                "weight": 1.25
            },
            "transfer_evidence": {
                "question": "Is there evidence that skills transfer to novel contexts or traditional assessments?",
                "serious_game": "Peer-reviewed studies show transfer to real-world problem solving or standardized tests",
                "gamification": "No evidence of transfer; engagement metrics substitute for learning outcomes",
                "weight": 1.0
            }
        }

        self.conditions = {
            "learning_integrity": "Learning objectives clearly drive design, not vice versa",
            "teacher_expertise": "Teachers receive training in pedagogical integration, not just technical operation",
            "rigorous_assessment": "Outcome measures assess transfer to novel contexts, not just in-game performance",
            "developmental_balance": "Screen time remains within healthy pediatric guidelines",
            "equitable_infrastructure": "Devices, connectivity, and ongoing support are reliably available"
        }

    def evaluate(self, game_name, scores, conditions_met=None, notes=""):
        """
        Evaluate a game based on framework scores.

        Args:
            game_name: Name of the educational technology product
            scores: dict with keys matching self.criteria, values 1.0-5.0
            conditions_met: dict with keys matching self.conditions, values True/False
            notes: Additional context about the product

        Returns:
            dict containing evaluation report
        """
        if conditions_met is None:
            conditions_met = {}

        # Calculate weighted score
        total_weight = 0
        weighted_sum = 0
        criterion_breakdown = {}

        for key, config in self.criteria.items():
            score = scores.get(key, 3.0)
            weight = config["weight"]
            weighted_sum += score * weight
            total_weight += weight
            criterion_breakdown[key] = {
                "score": score,
                "weight": weight,
                "contribution": score * weight
            }

        overall_score = weighted_sum / total_weight

        # Determine verdict
        if overall_score >= 4.0:
            verdict = "SERIOUS GAME"
            verdict_desc = "Learning objectives drive mechanics. Design integrity is present."
            color_code = "\033[92m"  # Green
        elif overall_score >= 3.0:
            verdict = "HYBRID / CONDITIONAL"
            verdict_desc = "Some design integrity exists, but gaps remain. Effectiveness depends on implementation context."
            color_code = "\033[93m"  # Yellow
        else:
            verdict = "GAMIFICATION"
            verdict_desc = "Entertainment mechanics or reward systems drive engagement. Learning is layered, not embedded."
            color_code = "\033[91m"  # Red

        # Check non-negotiable conditions
        condition_status = []
        missing_conditions = []
        for key, desc in self.conditions.items():
            met = conditions_met.get(key, False)
            condition_status.append({"name": key, "description": desc, "met": met})
            if not met:
                missing_conditions.append(desc)

        # Build conclusion
        conclusion = self._build_conclusion(
            game_name, overall_score, verdict, verdict_desc, 
            missing_conditions, notes
        )

        return {
            "game_name": game_name,
            "overall_score": round(overall_score, 2),
            "max_possible": 5.0,
            "verdict": verdict,
            "verdict_description": verdict_desc,
            "criterion_breakdown": criterion_breakdown,
            "conditions": condition_status,
            "missing_conditions": missing_conditions,
            "notes": notes,
            "conclusion": conclusion
        }

    def _build_conclusion(self, game_name, score, verdict, verdict_desc, missing, notes):
        """Generate a nuanced conclusion paragraph."""

        if verdict == "SERIOUS GAME":
            base = (
                f"{game_name} demonstrates strong design integrity across the framework criteria. "
                f"With a diagnostic score of {score:.2f}/5.0, it aligns with the serious game architecture: "
                f"learning objectives drive core mechanics, failure functions as a pedagogical tool, "
                f"and knowledge is embedded within systemic interaction rather than layered atop it."
            )
            if missing:
                base += (
                    f" However, the following non-negotiable conditions remain unmet: "
                    f"{'; '.join(missing)}. "
                    f"Without these, even a well-designed serious game risks becoming an expensive distraction."
                )
            else:
                base += " All non-negotiable implementation conditions appear satisfied."

        elif verdict == "HYBRID / CONDITIONAL":
            base = (
                f"{game_name} scores {score:.2f}/5.0, placing it in the conditional zone. "
                f"It possesses some structural elements of a serious game—{verdict_desc.lower()}—"
                f"but lacks the full design integrity required for unconditional endorsement. "
                f"Effectiveness will depend heavily on teacher expertise, assessment rigor, and contextual implementation."
            )
            if missing:
                base += f" Critical gaps include: {'; '.join(missing)}."

        else:  # GAMIFICATION
            base = (
                f"{game_name} scores {score:.2f}/5.0, indicating a gamification architecture rather than a serious game. "
                f"{verdict_desc} The product likely increases engagement metrics—time-on-task, click-through rates, "
                f"completion percentages—but there is little structural basis to expect deep learning or transfer. "
                f"It risks being entertainment disguised as education."
            )
            if missing:
                base += f" Additionally, implementation gaps persist: {'; '.join(missing)}."

        if notes:
            base += f"\n\nContextual Note: {notes}"

        base += (
            f"\n\nFinal Assessment: {game_name} is {verdict}. "
            f"The question is not whether it is 'good' or 'bad,' but whether its design logic produces "
            f"learning or merely the appearance of learning."
        )

        return base

    def print_report(self, report):
        """Print a formatted evaluation report to console."""
        print("=" * 70)
        print(f"  SERIOUS GAME DIAGNOSTIC FRAMEWORK")
        print(f"  Evaluation Report: {report['game_name']}")
        print("=" * 70)
        print()

        # Score bar
        score = report['overall_score']
        filled = int(score)
        bar = "█" * filled + "░" * (5 - filled)
        print(f"  Diagnostic Score: {score}/5.0  [{bar}]")
        print()

        # Verdict
        v = report['verdict']
        if v == "SERIOUS GAME":
            print(f"  VERDICT: ✅ {v}")
        elif v == "GAMIFICATION":
            print(f"  VERDICT: ⚠️  {v}")
        else:
            print(f"  VERDICT: ⚡ {v}")
        print(f"  {report['verdict_description']}")
        print()

        # Breakdown
        print("  Criterion Breakdown:")
        print("  " + "-" * 66)
        for key, data in report['criterion_breakdown'].items():
            label = key.replace('_', ' ').title()
            s = data['score']
            print(f"  • {label:<25} {s:.1f}/5.0")
        print()

        # Conditions
        print("  Non-Negotiable Conditions:")
        print("  " + "-" * 66)
        for cond in report['conditions']:
            status = "✅ MET" if cond['met'] else "❌ NOT MET"
            print(f"  • {cond['description']:<55} {status}")
        print()

        # Conclusion
        print("=" * 70)
        print("  CONCLUSION")
        print("=" * 70)
        print(f"  {report['conclusion']}")
        print()


def interactive_evaluation():
    """Run an interactive evaluation via command line."""
    evaluator = SeriousGameEvaluator()

    print("=" * 70)
    print("  SERIOUS GAME DIAGNOSTIC FRAMEWORK")
    print("  Group 24 | Objectives 1 & 2")
    print("=" * 70)
    print()
    print("  This tool implements the design-logic framework from the seminar:")
    print("  'Serious Games as Tools for Real-World Problem Solving'")
    print()
    print("  Rate each criterion from 1.0 to 5.0:")
    print("  1.0 = Pure Gamification  |  3.0 = Hybrid  |  5.0 = Pure Serious Game")
    print()

    game_name = input("  Enter the name of the educational game/app: ").strip()
    print()

    scores = {}
    for key, config in evaluator.criteria.items():
        print(f"  {config['question']}")
        print(f"    1.0 → {config['gamification']}")
        print(f"    5.0 → {config['serious_game']}")
        while True:
            try:
                val = float(input(f"  Score (1.0-5.0): "))
                if 1.0 <= val <= 5.0:
                    scores[key] = val
                    break
                else:
                    print("  Please enter a value between 1.0 and 5.0")
            except ValueError:
                print("  Please enter a valid number")
        print()

    print("  Non-Negotiable Implementation Conditions (y/n):")
    conditions_met = {}
    for key, desc in evaluator.conditions.items():
        while True:
            ans = input(f"  {desc}? (y/n): ").strip().lower()
            if ans in ('y', 'yes'):
                conditions_met[key] = True
                break
            elif ans in ('n', 'no'):
                conditions_met[key] = False
                break
            else:
                print("  Please enter 'y' or 'n'")

    notes = input("\n  Additional notes (press Enter to skip): ").strip()

    report = evaluator.evaluate(game_name, scores, conditions_met, notes)
    print()
    evaluator.print_report(report)

    return report


def quick_demo():
    """Run pre-loaded evaluations for DragonBox, Minecraft, and a Quiz App."""
    evaluator = SeriousGameEvaluator()

    test_cases = [
        {
            "name": "DragonBox (Algebra)",
            "scores": {
                "design_logic": 4.8,
                "cognitive_demand": 4.5,
                "failure_function": 4.0,
                "learning_depth": 4.7,
                "transfer_evidence": 2.5  # Long & Aleven 2017: no transfer
            },
            "conditions": {
                "learning_integrity": True,
                "teacher_expertise": False,
                "rigorous_assessment": False,
                "developmental_balance": True,
                "equitable_infrastructure": True
            },
            "notes": "Strong design integrity but weak transfer evidence in controlled studies."
        },
        {
            "name": "Minecraft Education Edition",
            "scores": {
                "design_logic": 4.0,
                "cognitive_demand": 4.2,
                "failure_function": 3.8,
                "learning_depth": 3.9,
                "transfer_evidence": 2.8  # Slattery 2025: all studies had bias
            },
            "conditions": {
                "learning_integrity": True,
                "teacher_expertise": False,
                "rigorous_assessment": False,
                "developmental_balance": True,
                "equitable_infrastructure": False
            },
            "notes": "Promising but methodologically weak evidence base; teacher expertise and infrastructure are variable."
        },
        {
            "name": "Math Quiz App (Points & Stars)",
            "scores": {
                "design_logic": 1.5,
                "cognitive_demand": 1.8,
                "failure_function": 1.2,
                "learning_depth": 1.5,
                "transfer_evidence": 1.0
            },
            "conditions": {
                "learning_integrity": False,
                "teacher_expertise": False,
                "rigorous_assessment": False,
                "developmental_balance": True,
                "equitable_infrastructure": True
            },
            "notes": "Classic gamification: points layered atop traditional math worksheets."
        }
    ]

    for case in test_cases:
        report = evaluator.evaluate(
            case["name"],
            case["scores"],
            case["conditions"],
            case["notes"]
        )
        evaluator.print_report(report)
        print("\n")


if __name__ == "__main__":
    print("Choose mode:")
    print("  1. Quick Demo (DragonBox, Minecraft, Quiz App)")
    print("  2. Interactive Evaluation (evaluate any game)")
    choice = input("Enter 1 or 2: ").strip()

    if choice == "1":
        quick_demo()
    elif choice == "2":
        interactive_evaluation()
    else:
        print("Invalid choice. Running quick demo...")
        quick_demo()
