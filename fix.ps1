$content = Get-Content 'background.js' -Raw

# Fix multiline userPrompt in formProverb function
$oldPrompt = @"
    const userPrompt = 'A seeker\'s feed contained this post:
"' \+ tweet \+ '"

It resonated with this inscription:
Title: ' \+ inscription\.title \+ '
Spell: ' \+ inscription\.spell \+ '
Proverb: "' \+ inscription\.proverb \+ '"
Spellbook: ' \+ inscription\.spellbookName \+ '

The resonance was felt because: ' \+ reasoning \+ '

FORM A NEW PROVERB \(under 30 words\) and create a SPELL \(emoji sequence, 5-12 symbols\)\.

Respond ONLY with JSON: \{"proverb": "<new proverb>", "spell": "<emojis>", "bridge": "<connection>"\}';
"@

$newPrompt = @"
    const userPrompt = 'A seeker\'s feed contained this post:\n"' + tweet + '"\n\nIt resonated with this inscription:\nTitle: ' + inscription.title + '\nSpell: ' + inscription.spell + '\nProverb: "' + inscription.proverb + '"\nSpellbook: ' + inscription.spellbookName + '\n\nThe resonance was felt because: ' + reasoning + '\n\nFORM A NEW PROVERB (under 30 words) and create a SPELL (emoji sequence, 5-12 symbols).\n\nRespond ONLY with JSON: {"proverb": "<new proverb>", "spell": "<emojis>", "bridge": "<connection>"}';
"@

$content = $content -replace [regex]::Escape($oldPrompt.Trim()), $newPrompt.Trim()

[System.IO.File]::WriteAllText("$PWD\background.js", $content)
Write-Host "Fixed"
